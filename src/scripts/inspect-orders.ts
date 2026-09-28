import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, client } from '../db/index';
import { orders, orderItems, products, stripeEvents } from '../db/schema';

async function main() {
    console.log('\n📦 orders:');
    console.table(await db.select().from(orders));

    console.log('\n📦 order_items:');
    console.table(await db.select().from(orderItems));

    console.log('\n📨 stripe_events:');
    console.table(
        await db
            .select({
                eventId: stripeEvents.eventId,
                type: stripeEvents.type,
                processedAt: stripeEvents.processedAt,
            })
            .from(stripeEvents),
    );

    console.log('\n👕 canvas-jacket inventory:');
    console.table(
        await db
            .select({ name: products.name, inventory: products.inventory })
            .from(products)
            .where(eq(products.slug, 'canvas-jacket')),
    );

    await client.end();
    console.log('\n🔌 Done.');
}

main().catch(async (err) => {
    console.error('❌ Failed:', err);
    try {
        await client.end();
    } catch {}
    process.exit(1);
});