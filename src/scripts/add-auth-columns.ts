import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, client } from '../db/index';

async function main() {
    console.log('🔧 Adding auth columns + password_reset_tokens table...\n');

    console.log('1/6  Adding password_hash to user...');
    await db.execute(sql`
        ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "password_hash" text
    `);

    console.log('2/6  Adding role to user...');
    await db.execute(sql`
        ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'customer'
    `);

    console.log('3/6  Adding timestamps to user...');
    await db.execute(sql`
        ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now()
    `);
    await db.execute(sql`
        ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now()
    `);

    console.log('4/6  Creating password_reset_tokens table...');
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
            "token_hash" text NOT NULL UNIQUE,
            "expires_at" timestamp NOT NULL,
            "used_at" timestamp,
            "created_at" timestamp DEFAULT now() NOT NULL
        )
    `);

    console.log('5/6  Creating indexes...');
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx"
        ON "password_reset_tokens" ("user_id")
    `);

    console.log('6/6  Backfilling roles — promoting existing store owners to seller...');
    const result = await db.execute(sql`
        UPDATE "user"
        SET "role" = 'seller'
        WHERE "id" IN (
            SELECT DISTINCT "user_id"
            FROM "stores"
            WHERE "deleted_at" IS NULL AND "user_id" IS NOT NULL
        )
        AND "role" = 'customer'
    `);
    console.log(`   → rows updated: ${(result as { count?: number }).count ?? '?'}`);

    const cols = await db.execute(sql`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'user'
          AND column_name IN ('password_hash', 'role', 'created_at', 'updated_at')
        ORDER BY column_name
    `);
    console.log('\n✅ user columns:');
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