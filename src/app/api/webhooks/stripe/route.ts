import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { db } from '@/db';
import { orders, orderItems, products } from '@/db/schema';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
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
        console.error(`[stripe-webhook] Signature verification failed: ${message}`);
        return NextResponse.json(
            { error: `Webhook Error: ${message}` },
            { status: 400 }
        );
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session);
                break;
            }
            default:
                // Acknowledge unhandled events to satisfy Stripe retries
                break;
        }
    } catch (err) {
        console.error('[stripe-webhook] Processing failed:', err);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }

    return NextResponse.json({ received: true }, { status: 200 });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const storeId = session.metadata?.storeId;
    if (!storeId) {
        throw new Error(`Missing storeId in session metadata: ${session.id}`);
    }

    const paymentIntentId =
        typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

    // Fetch line items with expanded product details
    const lineItemsResponse = await stripe.checkout.sessions.listLineItems(
        session.id,
        { expand: ['data.price.product'] }
    );
    const lineItems = lineItemsResponse.data;

    await db.transaction(async (tx) => {
        // 1. Idempotency guard: avoid duplicating existing order
        if (paymentIntentId) {
            const [existing] = await tx
                .select({ id: orders.id })
                .from(orders)
                .where(eq(orders.stripePaymentIntentId, paymentIntentId))
                .limit(1);

            if (existing) return;
        }

        // 2. Record Completed Order
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

        // 3. Insert line items & decrement physical stock
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
                console.warn(`[stripe-webhook] Missing productId for item: ${item.id}`);
                continue;
            }

            await tx.insert(orderItems).values({
                storeId,
                orderId: order.id,
                productId,
                quantity,
                unitPriceInCents: unitAmount,
            });

            // Decrement inventory atomically for physical merchandise
            if (!isDigital) {
                await tx
                    .update(products)
                    .set({
                        inventory: sql`${products.inventory} - ${quantity}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(products.id, productId));
            }
        }
    });
}