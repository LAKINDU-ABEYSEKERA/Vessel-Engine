import 'dotenv/config';
import { db, client } from '@/db';
import { stores, users } from '@/db/schema';

async function main() {
    // 1. Print all users
    const allUsers = await db.select().from(users);
    console.log('\n📋 Users in database:');
    if (allUsers.length === 0) {
        console.log('   (none — sign in via the browser first)');
        await client.end();
        return;
    }
    allUsers.forEach((u) => {
        console.log(`   → id: ${u.id}  |  email: ${u.email}  |  name: ${u.name}`);
    });

    // 2. Print all stores
    const allStores = await db.select().from(stores);
    console.log('\n🏬 Stores in database:');
    allStores.forEach((s) => {
        console.log(`   → subdomain: ${s.subdomain}  |  name: ${s.name}  |  userId: ${s.userId ?? 'NULL'}`);
    });

    // 3. Pick the most recently created user
    const targetUser = allUsers[allUsers.length - 1];
    console.log(`\n🔗 Linking all unowned stores to user: ${targetUser.email}`);

    // 4. Update any store with a NULL userId to point at this user
    let linked = 0;
    for (const store of allStores) {
        if (store.userId === null) {
            await db
                .update(stores)
                .set({ userId: targetUser.id })
                .where(
                    // equivalent to: WHERE subdomain = store.subdomain
                    // imported dynamically to keep the import list short
                    (await import('drizzle-orm')).eq(stores.subdomain, store.subdomain)
                );
            console.log(`   ✓ linked "${store.subdomain}"`);
            linked++;
        }
    }

    console.log(`\n✅ Done. ${linked} store(s) linked.`);
    await client.end();
}

main().catch(async (err) => {
    console.error('❌ Failed:', err);
    await client.end();
    process.exit(1);
});