import 'dotenv/config';
import { db, client } from './index';
import { stores, products, orders, orderItems } from './schema';

/**
 * Idempotent seed script for Vessel Engine.
 * Clears data in FK-safe order, then re-inserts sample tenants.
 */
async function seed() {
    console.log('🌱 [seed] Starting Vessel Engine database seed...');

    try {
        // 1. Clear existing data (child → parent to respect FK constraints)
        console.log('🧹 [seed] Clearing existing records...');
        await db.delete(orderItems);
        await db.delete(orders);
        await db.delete(products);
        await db.delete(stores);
        console.log('✅ [seed] Existing records cleared.');

        // 2. Tenant 1 — Acme Outfitters
        console.log('🏬 [seed] Seeding tenant: Acme Outfitters');
        const [acme] = await db
            .insert(stores)
            .values({
                name: 'Acme Outfitters',
                subdomain: 'acme',
            })
            .returning();

        console.log(`   → store.id = ${acme.id}`);

        const acmeProducts = await db
            .insert(products)
            .values([
                {
                    storeId: acme.id,
                    name: 'Heavyweight Canvas Jacket',
                    slug: 'canvas-jacket',
                    description: 'Rugged, weather-sealed heavyweight canvas jacket.',
                    priceInCents: 14500, // $145.00
                    inventory: 25,
                    isDigital: false,
                },
                {
                    storeId: acme.id,
                    name: 'Studio Soundfont Pack',
                    slug: 'soundfont-pack',
                    description: 'Curated soundfonts for studio production.',
                    priceInCents: 3500, // $35.00
                    inventory: 0,
                    isDigital: true,
                    assetUrl: 'https://cdn.vesselengine.com/demo/soundfont.zip',
                },
            ])
            .returning();

        console.log(`   → inserted ${acmeProducts.length} products.`);

        // 3. Tenant 2 — Artisan Presets
        console.log('🏬 [seed] Seeding tenant: Artisan Presets');
        const [artisan] = await db
            .insert(stores)
            .values({
                name: 'Artisan Presets',
                subdomain: 'artisan',
            })
            .returning();

        console.log(`   → store.id = ${artisan.id}`);

        const artisanProducts = await db
            .insert(products)
            .values([
                {
                    storeId: artisan.id,
                    name: 'Cinematic Lightroom LUTs',
                    slug: 'cinematic-luts',
                    description: 'Cinematic color grading LUT pack for Lightroom.',
                    priceInCents: 4900, // $49.00
                    inventory: 0,
                    isDigital: true,
                    assetUrl: 'https://cdn.vesselengine.com/demo/luts.zip',
                },
            ])
            .returning();

        console.log(`   → inserted ${artisanProducts.length} products.`);
        console.log(' [seed] Seed completed successfully.');
    } catch (err) {
        console.error(' [seed] Seed failed:', err);
        process.exitCode = 1;
    } finally {
        await client.end();
        console.log('🔌 [seed] Database client disconnected.');
    }
}

seed();