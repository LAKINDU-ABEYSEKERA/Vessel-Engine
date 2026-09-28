import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';

import { db } from '@/db';
import { orders, orderItems, products, stripeEvents } from '@/db/schema';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Type of the argument Drizzle passes into `db.transaction`'s callback. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function POST(request: Request) {
    // ------------------------------------------------------------------
    // 1. Verify the raw body + signature.
    // ------------------------------------------------------------------
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json(
            { error: 'Missing stripe-signature header' },
            { status: 400 }
        );
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(
            `[stripe-webhook] Signature verification failed: ${message}`
        );
        return NextResponse.json(
            { error: `Webhook Error: ${message}` },
            { status: 400 }
        );
    }

    // ------------------------------------------------------------------
    // 2. Record the event — idempotency guard via unique event_id.
    //
    //    ON CONFLICT DO NOTHING + RETURNING lets us detect duplicates
    //    without relying on exceptions. An empty return means the
    //    event_id is already logged.
    // ------------------------------------------------------------------
    const inserted = await db
        .insert(stripeEvents)
        .values({
            eventId: event.id,
            type: event.type,
            data: event as unknown as Record<string, unknown>,
        })
        .onConflictDoNothing({ target: stripeEvents.eventId })
        .returning({ id: stripeEvents.id });

    if (inserted.length === 0) {
        console.log(`[stripe-webhook] Duplicate event ignored: ${event.id}`);
        return NextResponse.json(
            { received: true, duplicate: true },
            { status: 200 }
        );
    }

    // ------------------------------------------------------------------
    // 3. Process the event inside a transaction. Mark the log row as
    //    processed within the same transaction so an order-creation
    //    failure rolls back cleanly.
    // ------------------------------------------------------------------
    try {
        await db.transaction(async (tx) => {
            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data
                        .object as Stripe.Checkout.Session;
                    await handleCheckoutCompleted(tx, session);
                    break;
                }
                default:
                    // Acknowledge unhandled types — do not fail.
                    break;
            }

            await tx
                .update(stripeEvents)
                .set({ processedAt: new Date() })
                .where(eq(stripeEvents.eventId, event.id));
        });
    } catch (err) {
        console.error('[stripe-webhook] Processing failed:', err);

        // Delete the event log row so Stripe's retry can re-insert and
        // re-process. Without this, the retry would hit ON CONFLICT DO
        // NOTHING and silently succeed with the order left unrecorded.
        await db
            .delete(stripeEvents)
            .where(eq(stripeEvents.eventId, event.id))
            .catch((cleanupErr) => {
                console.error('[stripe-webhook] Cleanup failed:', cleanupErr);
            });

        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }

    return NextResponse.json({ received: true }, { status: 200 });
}

/* -------------------------------------------------------------------------- */
/*  Handlers                                                                   */
/* -------------------------------------------------------------------------- */

async function handleCheckoutCompleted(
    tx: Tx,
    session: Stripe.Checkout.Session
) {
    const storeId = session.metadata?.storeId;
    if (!storeId) {
        throw new Error(`Missing storeId in session metadata: ${session.id}`);
    }

    const paymentIntentId =
        typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

    // Fetch line items with expanded product details.
    const lineItemsResponse = await stripe.checkout.sessions.listLineItems(
        session.id,
        { expand: ['data.price.product'] }
    );
    const lineItems = lineItemsResponse.data;

    // ------------------------------------------------------------------
    // Order-level idempotency — protects against the (rare) case where the
    // event row was deleted by a prior failed attempt and the event is
    // retried after the order was actually created.
    // ------------------------------------------------------------------
    if (paymentIntentId) {
        const [existing] = await tx
            .select({ id: orders.id })
            .from(orders)
            .where(eq(orders.stripePaymentIntentId, paymentIntentId))
            .limit(1);

        if (existing) return;
    }

    // ------------------------------------------------------------------
    // Record the order.
    // ------------------------------------------------------------------
    const [order] = await tx
        .insert(orders)
        .values({
            storeId,
            stripePaymentIntentId: paymentIntentId,
            stripeSessionId: session.id,
            customerEmail: session.customer_details?.email ?? 'anonymous',
            totalAmountInCents: session.amount_total ?? 0,
            status: 'completed',
        })
        .returning({ id: orders.id });

    // ------------------------------------------------------------------
    // Insert line items & decrement physical inventory.
    // ------------------------------------------------------------------
    for (const item of lineItems) {
        const priceProduct =
            item.price?.product && typeof item.price.product !== 'string'
                ? (item.price.product as Stripe.Product)
                : null;

        const productId = priceProduct?.metadata?.productId;
        const isDigital = priceProduct?.metadata?.isDigital === 'true';
        const quantity = item.quantity ?? 1;
        const unitAmount = item.price?.unit_amount ?? 0;

        if (!productId) {
            console.warn(
                `[stripe-webhook] Missing productId for item: ${item.id}`
            );
            continue;
        }

        await tx.insert(orderItems).values({
            storeId,
            orderId: order.id,
            productId,
            quantity,
            unitPriceInCents: unitAmount,
        });

        if (!isDigital) {
            await tx
                .update(products)
                .set({
                    inventory: sql`GREATEST(0, ${products.inventory} - ${quantity})`,
                    updatedAt: new Date(),
                })
                .where(eq(products.id, productId));
        }
    }
}