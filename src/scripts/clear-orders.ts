import 'dotenv/config';
import { db, client } from '../db/index';
import { orderItems, orders } from '../db/schema';

async function main() {
    console.log('🧹 Deleting all orders and order items...');
    await db.delete(orderItems);
    await db.delete(orders);
    console.log('✅ Done.');
    await client.end();
}

main().catch(async (err) => {
    console.error('❌ Failed:', err);
    try { await client.end(); } catch {}
    process.exit(1);
});