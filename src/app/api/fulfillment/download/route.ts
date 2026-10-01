import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type Stripe from 'stripe';

import { db } from '@/db';
import { products } from '@/db/schema';
import { stripe } from '@/lib/stripe';
import { s3, S3_BUCKET } from '@/lib/s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Presigned URL lifetime — short enough to prevent link sharing. */
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Extract a bare filename from whatever shape `products.assetUrl` holds.
 *
 * Canonical form (post-migration): a bare filename, e.g. `soundfont.zip`.
 * Legacy form: a full URL whose last path segment is the filename.
 * The migration script `normalize-asset-urls.ts` rewrites legacy rows.
 */
function extractAssetFilename(assetUrl: string): string | null {
    const trimmed = assetUrl.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        const segments = parsed.pathname.split('/').filter(Boolean);
        return segments[segments.length - 1] || null;
    } catch {
        const segments = trimmed.split('/').filter(Boolean);
        return segments[segments.length - 1] || null;
    }
}

/**
 * Conservative filename allowlist — this value ends up in an R2 key and
 * in a Content-Disposition header, so we refuse anything that could
 * traverse directories or inject header characters.
 */
function isSafeFilename(filename: string): boolean {
    if (!filename || filename.length > 200) return false;
    if (filename === '.' || filename === '..') return false;
    // Only ASCII letters, digits, dot, underscore, dash
    return /^[A-Za-z0-9._-]+$/.test(filename);
}

export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const productParam = request.nextUrl.searchParams.get('product');

    if (!sessionId || !productParam) {
        return new NextResponse('Missing session_id or product', { status: 400 });
    }

    // ------------------------------------------------------------------
    // 1. Retrieve the Stripe Checkout session with expanded line items.
    // ------------------------------------------------------------------
    let session: Stripe.Checkout.Session;
    try {
        session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['line_items.data.price.product'],
        });
    } catch {
        return new NextResponse('Session not found', { status: 404 });
    }

    // ------------------------------------------------------------------
    // 2. Verify payment. `no_payment_required` is a legitimate terminal
    //    state for fully-discounted / free sessions.
    // ------------------------------------------------------------------
    if (
        session.payment_status !== 'paid' &&
        session.payment_status !== 'no_payment_required'
    ) {
        return new NextResponse('Payment not completed', { status: 403 });
    }

    // ------------------------------------------------------------------
    // 3. Verify the requested product is part of this session.
    //    `productParam` is the DB UUID we stored in
    //    `product_data.metadata.productId` at checkout time.
    // ------------------------------------------------------------------
    const lineItems = session.line_items?.data ?? [];
    let dbProductId: string | null = null;

    for (const item of lineItems) {
        const product = item.price?.product;
        if (!product || typeof product === 'string') continue;

        const stripeProduct = product as Stripe.Product;
        const metadataProductId = stripeProduct.metadata?.productId ?? null;

        if (metadataProductId === productParam) {
            dbProductId = metadataProductId;
            break;
        }
    }

    if (!dbProductId) {
        return new NextResponse('Product not found in this order', {
            status: 403,
        });
    }

    // ------------------------------------------------------------------
    // 4. Fetch the authoritative asset + store reference from the DB.
    // ------------------------------------------------------------------
    const [record] = await db
        .select({
            id: products.id,
            name: products.name,
            assetUrl: products.assetUrl,
            isDigital: products.isDigital,
            storeId: products.storeId,
        })
        .from(products)
        .where(eq(products.id, dbProductId))
        .limit(1);

    if (!record || !record.isDigital || !record.assetUrl) {
        return new NextResponse('Fulfillment not available', { status: 404 });
    }

    // ------------------------------------------------------------------
    // 5. Build the R2 key from a trusted storeId + a validated filename.
    //    Key layout: stores/{storeId}/assets/{filename}
    // ------------------------------------------------------------------
    const filename = extractAssetFilename(record.assetUrl);
    if (!filename || !isSafeFilename(filename)) {
        console.error('[fulfillment] Unsafe asset reference', {
            productId: record.id,
            assetUrl: record.assetUrl,
        });
        return new NextResponse('Asset reference invalid', { status: 500 });
    }

    const key = `stores/${record.storeId}/assets/${filename}`;

    // ------------------------------------------------------------------
    // 6. Verify the object actually exists in R2 BEFORE issuing a URL.
    //
    //    Without this, a missing file causes R2 to serve its raw
    //    `NoSuchKey` XML body to the customer after the redirect. The
    //    HEAD check converts that into a friendly, structured 404 on
    //    our own domain — and lets us log the exact key.
    // ------------------------------------------------------------------
    try {
        await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    } catch (err) {
        const name = (err as { name?: string }).name;
        if (name === 'NotFound' || name === 'NoSuchKey') {
            console.error('[fulfillment] Asset missing in R2', { key });
            return new NextResponse(
                'This download is not available yet. Please contact the store owner.',
                { status: 404 },
            );
        }
        console.error('[fulfillment] HeadObject failed', err);
        return new NextResponse('Could not verify download', { status: 500 });
    }

    // ------------------------------------------------------------------
    // 7. Generate a short-lived presigned GET URL.
    // ------------------------------------------------------------------
    let signedUrl: string;
    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            // Force a download prompt instead of inline preview.
            ResponseContentDisposition: `attachment; filename="${filename}"`,
        });

        signedUrl = await getSignedUrl(s3, command, {
            expiresIn: SIGNED_URL_TTL_SECONDS,
        });
    } catch (err) {
        console.error('[fulfillment] Failed to sign URL', err);
        return new NextResponse('Could not prepare download', { status: 500 });
    }

    // ------------------------------------------------------------------
    // 8. Redirect to the presigned URL.
    // ------------------------------------------------------------------
    return NextResponse.redirect(signedUrl);
}