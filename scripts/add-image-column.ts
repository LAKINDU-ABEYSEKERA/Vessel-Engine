import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, client } from '../src/db/index';

async function main() {
    console.log('🔧 Adding image_url column to products table...');

    await db.execute(sql`
        ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "image_url" text
    `);

    // Verify
    const result = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'products'
          AND column_name = 'image_url'
    `);

    console.log('✓ Verification result:', result);

    await client.end();
    console.log('🔌 Done.');
}

main().catch(async (err) => {
    console.error('❌ Failed:', err);
    try {
        await client.end();
    } catch {}
    process.exit(1);
});