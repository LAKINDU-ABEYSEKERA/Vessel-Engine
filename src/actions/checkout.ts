'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { products, stores } from '@/db/schema';
import { stripe } from '@/lib/stripe';
import { auth } from '@/auth';

export interface CartItemInput {
    id: string;
    quantity: number;
}

export async function createCheckoutSession(
    items: CartItemInput[],
    tenantSlug: string
): Promise<never> {
    // ------------------------------------------------------------------
    // 0. Resolve the signed-in customer, if any. Guests fall through to
    //    Stripe's default email field.
    // ------------------------------------------------------------------
    const session = await auth();
    const userEmail = session?.user?.email ?? null;

    // ─── TEMPORARY DIAGNOSTIC ─────────────────────────────────────────────
    const _headers = await headers();
    console.log('[checkout-diag] host:', _headers.get('host'));
    console.log('[checkout-diag] session email:', userEmail ?? '(none)');
    console.log('[checkout-diag] session user id:', session?.user?.id ?? '(none)');
// ──────────────────────────────────────────────────────────────────────

    // ------------------------------------------------------------------
    // 1. Guard: non-empty cart
    // ------------------------------------------------------------------
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Cart is empty.');
    }

    const normalized = new Map<string, number>();
    for (const item of items) {
        if (
            typeof item?.id !== 'string' ||
            typeof item?.quantity !== 'number' ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
        ) {
            throw new Error('Invalid cart payload.');
        }
        const existing = normalized.get(item.id) ?? 0;
        normalized.set(item.id, existing + item.quantity);
    }

    const productIds = Array.from(normalized.keys());

    // ------------------------------------------------------------------
    // 2. Resolve tenant
    // ------------------------------------------------------------------
    const [store] = await db
        .select({ id: stores.id, subdomain: stores.subdomain })
        .from(stores)
        .where(and(eq(stores.subdomain, tenantSlug), isNull(stores.deletedAt)))
        .limit(1);

    if (!store) {
        throw new Error(`Storefront "${tenantSlug}" not found.`);
    }

    // ------------------------------------------------------------------
    // 3. Fetch authoritative product rows
    // ------------------------------------------------------------------
    const dbProducts = await db
        .select()
        .from(products)
        .where(
            and(
                inArray(products.id, productIds),
                eq(products.storeId, store.id)
            )
        );

    if (dbProducts.length !== productIds.length) {
        throw new Error(
            'One or more items in your cart are no longer available.'
        );
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // ------------------------------------------------------------------
    // 4. Validate stock + build line items
    // ------------------------------------------------------------------
    const lineItems = productIds.map((id) => {
        const product = productMap.get(id);
        const quantity = normalized.get(id)!;

        if (!product) {
            throw new Error(`Product ${id} not found.`);
        }

        if (!product.isDigital && product.inventory < quantity) {
            throw new Error(
                `Insufficient stock for "${product.name}". Only ${product.inventory} remaining.`
            );
        }

        return {
            quantity,
            price_data: {
                currency: 'usd',
                unit_amount: product.priceInCents,
                product_data: {
                    name: product.name,
                    description: product.description ?? undefined,
                    metadata: {
                        productId: product.id,
                        storeId: product.storeId,
                        isDigital: String(product.isDigital),
                    },
                },
            },
        };
    });

    // ------------------------------------------------------------------
    // 5. Derive tenant-aware return URLs
    // ------------------------------------------------------------------
    const headerList = await headers();
    const host = headerList.get('host') ?? `${store.subdomain}.localhost:3000`;
    const protocol =
        headerList.get('x-forwarded-proto') ??
        (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    // ------------------------------------------------------------------
    // 6. Create Stripe Checkout Session
    //
    //    `customer_email` is the fix: it locks the email field on the
    //    Stripe page so the customer cannot change it, and guarantees
    //    the webhook stores the same address the customer dashboard
    //    queries by.
    // ------------------------------------------------------------------
    const checkout = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?canceled=true`,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        ...(userEmail ? { customer_email: userEmail } : {}),
        metadata: {
            storeId: store.id,
            tenantSlug: store.subdomain,
        },
    });

    if (!checkout.url) {
        throw new Error('Stripe did not return a checkout URL.');
    }

    redirect(checkout.url);
}