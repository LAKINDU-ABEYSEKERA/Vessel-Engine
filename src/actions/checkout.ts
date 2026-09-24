'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { products, stores } from '@/db/schema';
import { stripe } from '@/lib/stripe';

export interface CartItemInput {
    id: string;
    quantity: number;
}

/**
 * Creates a Stripe Checkout Session for a given tenant's cart.
 *
 * - Authoritative pricing is fetched from the database (client prices are never trusted).
 * - Physical goods are validated against `products.inventory` before the session is created.
 * - Redirects the user to Stripe's hosted checkout page.
 */
export async function createCheckoutSession(
    items: CartItemInput[],
    tenantSlug: string
): Promise<never> {
    // ------------------------------------------------------------------
    // 1. Guard: non-empty cart
    // ------------------------------------------------------------------
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Cart is empty.');
    }

    // Sanitize and deduplicate client input.
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
        .where(eq(stores.subdomain, tenantSlug))
        .limit(1);

    if (!store) {
        throw new Error(`Storefront "${tenantSlug}" not found.`);
    }

    // ------------------------------------------------------------------
    // 3. Fetch authoritative product rows (DB prices, DB inventory)
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
    // 4. Validate stock + build Stripe line items
    // ------------------------------------------------------------------
    const lineItems = productIds.map((id) => {
        const product = productMap.get(id);
        const quantity = normalized.get(id)!;

        if (!product) {
            throw new Error(`Product ${id} not found.`);
        }

        // Physical goods: enforce inventory ceiling.
        if (!product.isDigital && product.inventory < quantity) {
            throw new Error(
                `Insufficient stock for "${product.name}". Only ${product.inventory} remaining.`
            );
        }

        return {
            quantity,
            price_data: {
                currency: 'usd',
                unit_amount: product.priceInCents, // integer cents, straight from DB
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
    // 5. Derive tenant-aware return URLs from request headers
    // ------------------------------------------------------------------
    const headerList = await headers();
    const host = headerList.get('host') ?? `${store.subdomain}.localhost:3000`;
    const protocol =
        headerList.get('x-forwarded-proto') ??
        (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    // ------------------------------------------------------------------
    // 6. Create Stripe Checkout Session
    // ------------------------------------------------------------------
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?canceled=true`,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        metadata: {
            storeId: store.id,
            tenantSlug: store.subdomain,
        },
    });

    if (!session.url) {
        throw new Error('Stripe did not return a checkout URL.');
    }

    // ------------------------------------------------------------------
    // 7. Redirect to Stripe
    // ------------------------------------------------------------------
    redirect(session.url);
}