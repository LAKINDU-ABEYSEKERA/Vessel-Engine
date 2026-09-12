import { unstable_cache } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { stores, products } from '@/db/schema';

export const storefrontTags = {
  store: (subdomain: string) => `store-${subdomain}`,
  products: (storeId: string) => `products-${storeId}`,
};

/**
 * Fetch a tenant store by its subdomain.
 * Dynamic tag attached: `store-${subdomain}`.
 */
export async function getTenantStore(subdomain: string) {
  return unstable_cache(
    async () => {
      const [store] = await db
        .select()
        .from(stores)
        .where(eq(stores.subdomain, subdomain))
        .limit(1);
      return store ?? null;
    },
    ['tenant-store', subdomain],
    {
      tags: ['tenant-store', storefrontTags.store(subdomain)],
      revalidate: 60,
    }
  )();
}

/**
 * Fetch all products belonging to a given store.
 * Dynamic tag attached: `products-${storeId}`.
 */
export async function getStoreProducts(storeId: string) {
  return unstable_cache(
    async () => {
      return db
        .select()
        .from(products)
        .where(eq(products.storeId, storeId));
    },
    ['store-products', storeId],
    {
      tags: ['store-products', storefrontTags.products(storeId)],
      revalidate: 60,
    }
  )();
}