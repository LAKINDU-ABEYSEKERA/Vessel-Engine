import 'dotenv/config';
import { desc } from 'drizzle-orm';
import { db, client } from '../db/index';
import { orders, stores } from '../db/schema';

async function main() {
    const rows = await db
        .select({
            id: orders.id,
            email: orders.customerEmail,
            amount: orders.totalAmountInCents,
            status: orders.status,
            createdAt: orders.createdAt,
            storeName: stores.name,
        })
        .from(orders)
        .leftJoin(stores, (await import('drizzle-orm')).eq(stores.id, orders.storeId))
        .orderBy(desc(orders.createdAt))
        .limit(20);

    console.log(`\n📦 ${rows.length} recent order(s):\n`);
    console.table(
        rows.map((r) => ({
            id: r.id.slice(0, 8),
            email: r.email,
            store: r.storeName,
            amount: `$${(r.amount / 100).toFixed(2)}`,
            status: r.status,
            when: r.createdAt.toISOString(),
        })),
    );

    await client.end();
}

main().catch(async (err) => {
    console.error('❌ Failed:', err);
    try { await client.end(); } catch {}
    process.exit(1);
});