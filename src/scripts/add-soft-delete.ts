import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, client } from '../db/index';

async function main() {
    console.log('🔧 Repairing stores table for soft delete...\n');

    console.log('1/3  Adding deleted_at column...');
    await db.execute(sql`
        ALTER TABLE "stores"
            ADD COLUMN IF NOT EXISTS "deleted_at" timestamp
    `);

    console.log('2/3  Dropping old unique constraints...');
    await db.execute(sql`ALTER TABLE "stores" DROP CONSTRAINT IF EXISTS "stores_subdomain_unique"`);
    await db.execute(sql`ALTER TABLE "stores" DROP CONSTRAINT IF EXISTS "stores_custom_domain_unique"`);

    console.log('3/3  Creating partial unique indexes...');
    await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "stores_subdomain_active_unique"
        ON "stores" ("subdomain")
        WHERE "deleted_at" IS NULL
    `);
    await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "stores_custom_domain_active_unique"
            ON "stores" ("custom_domain")
            WHERE "deleted_at" IS NULL AND "custom_domain" IS NOT NULL
    `);

    const cols = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'deleted_at'
    `);
    const idx = await db.execute(sql`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'stores' AND indexname LIKE 'stores_%unique%'
    `);

    console.log('\n✅ Done. Verification:');
    console.log('   columns matching deleted_at:', cols);
    console.log('   unique indexes on stores:', idx);

    await client.end();
}

main().catch(async (err) => {
    console.error('❌ Failed:', err);
    try { await client.end(); } catch {}
    process.exit(1);
});