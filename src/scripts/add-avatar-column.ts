import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, client } from '../db/index';

async function main() {
    console.log('🔧 Adding avatar_url column to user...\n');

    await db.execute(sql`
        ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "avatar_url" text
    `);

    const cols = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'user'
          AND column_name = 'avatar_url'
    `);
    console.log('✅ Verification:');
    console.table(cols);

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