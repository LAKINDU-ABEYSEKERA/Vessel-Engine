import 'dotenv/config';
import { db, client } from './index';
import { stores, products, orders, orderItems } from './schema';

async function seed() {
    console.log('🌱 [seed] Starting Vessel Engine database seed...');

    try {
        console.log('🧹 [seed] Clearing existing records...');
        await db.delete(orderItems);
        await db.delete(orders);
        await db.delete(products);
        await db.delete(stores);
        console.log('✅ [seed] Existing records cleared.');

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
                    priceInCents: 14500,
                    inventory: 25,
                    isDigital: false,
                    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
                },
                {
                    storeId: acme.id,
                    name: 'Studio Soundfont Pack',
                    slug: 'soundfont-pack',
                    description: 'Curated soundfonts for studio production.',
                    priceInCents: 3500,
                    inventory: 0,
                    isDigital: true,
                    assetUrl: 'https://cdn.vesselengine.com/demo/soundfont.zip',
                    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80',
                },
                {
                    storeId: acme.id,
                    name: 'Nomad Daypack',
                    slug: 'nomad-daypack',
                    description: 'Water-resistant 20L daypack with a 16-inch laptop sleeve.',
                    priceInCents: 8900,
                    inventory: 15,
                    isDigital: false,
                    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
                },
                {
                    storeId: acme.id,
                    name: 'Vessel UI Kit (Figma)',
                    slug: 'vessel-ui-kit',
                    description: 'Complete e-commerce component library for Figma.',
                    priceInCents: 4900,
                    inventory: 0,
                    isDigital: true,
                    assetUrl: 'https://cdn.vesselengine.com/demo/ui-kit.fig',
                    imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
                },
                {
                    storeId: acme.id,
                    name: 'Minimalist Steel Tumbler',
                    slug: 'steel-tumbler',
                    description: 'Double-wall vacuum insulated 16oz tumbler.',
                    priceInCents: 2400,
                    inventory: 50,
                    isDigital: false,
                    imageUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&q=80',
                },
                {
                    storeId: acme.id,
                    name: 'Next.js Performance Course',
                    slug: 'nextjs-course',
                    description: 'Advanced video course on App Router optimization.',
                    priceInCents: 12000,
                    inventory: 0,
                    isDigital: true,
                    assetUrl: 'https://cdn.vesselengine.com/demo/course-access.pdf',
                    imageUrl: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80',
                },
                {
                    storeId: acme.id,
                    name: 'Merino Wool Beanie',
                    slug: 'wool-beanie',
                    description: 'Itch-free, breathable warmth for winter commutes.',
                    priceInCents: 3200,
                    inventory: 8,
                    isDigital: false,
                    imageUrl: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80',
                },
                {
                    storeId: acme.id,
                    name: 'Creator Notion Templates',
                    slug: 'notion-templates',
                    description: 'Content calendar and sponsorship tracking templates.',
                    priceInCents: 1900,
                    inventory: 0,
                    isDigital: true,
                    assetUrl: 'https://cdn.vesselengine.com/demo/notion-link.pdf',
                    imageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&q=80',
                },
                {
                    storeId: acme.id,
                    name: 'Everyday Pocket Tee',
                    slug: 'pocket-tee',
                    description: 'Pre-shrunk, garment-dyed heavyweight cotton tee.',
                    priceInCents: 2800,
                    inventory: 120,
                    isDigital: false,
                    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
                },
                {
                    storeId: acme.id,
                    name: 'Analog Film Presets',
                    slug: 'film-presets',
                    description: 'Vintage color grading profiles for Adobe Lightroom.',
                    priceInCents: 2500,
                    inventory: 0,
                    isDigital: true,
                    assetUrl: 'https://cdn.vesselengine.com/demo/film-presets.zip',
                    imageUrl: 'https://images.unsplash.com/photo-1495121605193-b116b5b9c5fe?w=800&q=80',
                },
            ])
            .returning();

        console.log(`   → inserted ${acmeProducts.length} products.`);

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
                    priceInCents: 4900,
                    inventory: 0,
                    isDigital: true,
                    assetUrl: 'https://cdn.vesselengine.com/demo/luts.zip',
                    imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80',
                },
            ])
            .returning();

        console.log(`   → inserted ${artisanProducts.length} products.`);
        console.log('✅ [seed] Seed completed successfully.');
    } catch (err) {
        console.error('❌ [seed] Seed failed:', err);
        process.exitCode = 1;
    } finally {
        await client.end();
        console.log('🔌 [seed] Database client disconnected.');
    }
}

seed();