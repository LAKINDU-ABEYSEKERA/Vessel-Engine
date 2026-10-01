import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, client } from '../db/index';

/**
 * One-time migration: normalize `products.asset_url` to bare filenames.
 *
 * Legacy rows may hold:
 *   - Full URLs:        https://cdn.vesselengine.com/demo/soundfont.zip
 *   - Scoped keys:      some/path/soundfont.zip
 *   - Bare filenames:   soundfont.zip                       (already correct)
 *   - Empty / null:     untouched
 *
 * This script rewrites the first two forms to the last path segment.
 * Rerunning is idempotent — already-normalized rows are skipped.
 *
 * NOTE: This migration does NOT upload missing files to R2. If a
 * referenced asset doesn't exist in the bucket, downloads still 404 —
 * but now with a friendly message instead of R2's raw XML.
 */
async function main() {
    console.log('🔧 [normalize-assets] Starting asset_url migration...\n');

    const result = await db.execute(sql`
        SELECT id, asset_url
        FROM products
        WHERE asset_url IS NOT NULL
          AND asset_url <> ''
    `);

    const rows = result as unknown as Array<{ id: string; asset_url: string }>;

    console.log(`📦 Found ${rows.length} product(s) with an asset_url.\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {
        const original = row.asset_url;

        const looksLikeUrl = /^[a-z][a-z0-9+.-]*:/i.test(original);
        const hasSlash = original.includes('/');

        if (!looksLikeUrl && !hasSlash) {
            skipped++;
            continue;
        }

        let filename: string | null = null;
        try {
            if (looksLikeUrl) {
                const parsed = new URL(original);
                const segments = parsed.pathname.split('/').filter(Boolean);
                filename = segments[segments.length - 1] || null;
            } else {
                const segments = original.split('/').filter(Boolean);
                filename = segments[segments.length - 1] || null;
            }
        } catch {
            filename = null;
        }

        if (!filename || filename === original) {
            console.warn(`   ⚠ Could not normalize: "${original}" — skipping.`);
            failed++;
            continue;
        }

        await db.execute(sql`
            UPDATE products
            SET asset_url = ${filename},
                updated_at = now()
            WHERE id = ${row.id}
        `);

        console.log(`   ✓ ${original}\n     → ${filename}`);
        updated++;
    }

    console.log(`\n✅ Migration complete.`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped (already bare): ${skipped}`);
    console.log(`   Failed (could not parse): ${failed}`);

    if (updated > 0) {
        console.log(`\n⚠  Remember to upload the referenced files to R2 at`);
        console.log(`   stores/{storeId}/assets/{filename} — otherwise downloads`);
        console.log(`   will return 404. Re-uploading through the product form is`);
        console.log(`   the easiest way.`);
    }

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