import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, client } from '../db/index';

async function main() {
    console.log('🔍 [check-user-schema] Inspecting "user" table...\n');

    // 1. What columns actually exist?
    const cols = await db.execute(sql`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'user'
        ORDER BY ordinal_position
    `);

    console.log('📋 Columns present in the DB:');
    console.table(cols);

    // 2. Which columns does the app need?
    const required = [
        'id',
        'name',
        'email',
        'emailVerified',
        'image',
        'password_hash',
        'role',
        'avatar_url',
        'created_at',
        'updated_at',
    ];

    const present = new Set(
        (cols as unknown as Array<{ column_name: string }>).map(
            (c) => c.column_name,
        ),
    );
    const missing = required.filter((c) => !present.has(c));

    if (missing.length > 0) {
        console.log('\n❌ MISSING COLUMNS:', missing.join(', '));
        console.log('\n   Run the following scripts to add them:');
        console.log('   $ npx tsx src/scripts/add-auth-columns.ts');
        console.log('   $ npx tsx src/scripts/add-avatar-column.ts');
    } else {
        console.log('\n✅ All required columns present.');
    }

    // 3. Can we actually query? (this is the exact query that failed)
    try {
        const rows = await db.execute(sql`
            SELECT "name", "email", "avatar_url", "image", "role"
            FROM "user"
            LIMIT 1
        `);
        console.log('\n✅ Test query succeeded. Rows returned:', (rows as unknown[]).length);
    } catch (err) {
        console.log('\n❌ Test query FAILED:');
        console.error(err);
    }

    await client.end();
}

main().catch(async (err) => {
    console.error('❌ Failed:', err);
    try { await client.end(); } catch {}
    process.exit(1);
});