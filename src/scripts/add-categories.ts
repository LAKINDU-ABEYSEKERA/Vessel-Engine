import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, client } from '../db/index';

async function main() {
    console.log('🔧 Creating categories + product_categories tables...\n');

    console.log('1/4  Creating categories table...');
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "categories" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
            "name" text NOT NULL,
            "slug" text NOT NULL,
            "type" text DEFAULT 'other' NOT NULL,
            "position" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        )
    `);

    console.log('2/4  Creating product_categories junction table...');
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "product_categories" (
            "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
            "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
            CONSTRAINT "product_categories_product_id_category_id_pk"
                PRIMARY KEY ("product_id", "category_id")
        )
    `);

    console.log('3/4  Creating indexes...');
    await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "categories_store_slug_unique_idx"
        ON "categories" ("store_id", "slug")
    `);
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "categories_store_id_idx"
        ON "categories" ("store_id")
    `);
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "categories_store_position_idx"
        ON "categories" ("store_id", "position")
    `);
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "product_categories_category_id_idx"
        ON "product_categories" ("category_id")
    `);

    console.log('4/4  Verifying...');
    const tables = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name IN ('categories', 'product_categories')
        ORDER BY table_name
    `);
    console.log('\n✅ Verification:', tables);

    await client.end();
}

main().catch(async (err) => {
    console.error('❌ Failed:', err);
    try { await client.end(); } catch {}
    process.exit(1);
});