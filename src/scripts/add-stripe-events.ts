import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, client } from '../db/index';

async function main() {
    console.log('🔧 Creating stripe_events table...');

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "stripe_events" (
                                                       "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "event_id" text NOT NULL,
            "type" text NOT NULL,
            "data" jsonb NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "processed_at" timestamp,
            CONSTRAINT "stripe_events_event_id_unique" UNIQUE("event_id")
            )
    `);

    const result = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'stripe_events'
        ORDER BY ordinal_position
    `);

    console.log('✓ Verification — columns:');
    console.table(result);

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