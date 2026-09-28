import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type Stripe from 'stripe';

import { db } from '@/db';
import { products } from '@/db/schema';
import { stripe } from '@/lib/stripe';
import { s3, S3_BUCKET } from '@/lib/s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Presigned URL lifetime in seconds. Short enough to prevent sharing. */
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Extracts the asset filename from the stored `assetUrl` column.
 *
 * In production, `assetUrl` should hold a bare key like `soundfont.zip`.
 * Legacy/demo data may hold a full URL — this helper normalizes both.
 */
function extractAssetFilename(assetUrl: string): string | null {
    const trimmed = assetUrl.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        const segments = parsed.pathname.split('/').filter(Boolean);
        return segments[segments.length - 1] || null;
    } catch {
        // Not a URL — treat as a bare filename.
        return trimmed;
    }
}

export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const productParam = request.nextUrl.searchParams.get('product');

    if (!sessionId || !productParam) {
        return new NextResponse('Missing session_id or product', {
            status: 400,
        });
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
    // 2. Verify payment.
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------
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
    // 5. Build the R2 key and generate a presigned GET URL.
    //    Key layout: stores/{storeId}/assets/{filename}
    // ------------------------------------------------------------------
    const filename = extractAssetFilename(record.assetUrl);
    if (!filename) {
        return new NextResponse('Asset reference invalid', { status: 500 });
    }

    const key = `stores/${record.storeId}/assets/${filename}`;

    let signedUrl: string;
    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            // Content-Disposition forces a download prompt instead of an
            // inline browser preview. Filename is preserved from the key.
            ResponseContentDisposition: `attachment; filename="${filename}"`,
        });

        signedUrl = await getSignedUrl(s3, command, {
            expiresIn: SIGNED_URL_TTL_SECONDS,
        });
    } catch (err) {
        console.error('[fulfillment] Failed to sign URL:', err);
        return new NextResponse('Could not prepare download', { status: 500 });
    }

    // ------------------------------------------------------------------
    // 6. Redirect to the presigned URL.
    // ------------------------------------------------------------------
    return NextResponse.redirect(signedUrl);
}