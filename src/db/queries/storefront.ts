import { unstable_cache } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { stores, products } from '@/db/schema';

export const storefrontTags = {
  store: (subdomain: string) => `store-${subdomain}`,
  products: (storeId: string) => `products-${storeId}`,
};

/**
 * Cache-wrapper memoization.
 *
 * `unstable_cache` needs the per-entity tag baked into the wrapper at
 * construction time. Building a fresh wrapper on every call — as the
 * previous implementation did — pays a per-request setup cost and makes
 * tag registration redundant. We key the wrappers by their entity
 * argument instead, so each distinct subdomain/storeId gets exactly one
 * wrapper for the process lifetime.
 *
 * Bounded by tenant count; even at 10k stores this is a few MB of
 * closures. If you ever need to cap it, wrap with an LRU.
 */
const tenantStoreCache = new Map<string, () => Promise<unknown>>();
const storeProductsCache = new Map<string, () => Promise<unknown>>();

/**
 * Fetch a tenant store by its subdomain.
 * Cached with tags: `tenant-store`, `store-${subdomain}`. Revalidates every 60s.
 */
export async function getTenantStore(subdomain: string) {
  let cached = tenantStoreCache.get(subdomain);
  if (!cached) {
    cached = unstable_cache(
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
    );
    tenantStoreCache.set(subdomain, cached);
  }
  return cached();
}

/**
 * Fetch all products belonging to a given store.
 * Cached with tags: `store-products`, `products-${storeId}`. Revalidates every 60s.
 */
export async function getStoreProducts(storeId: string) {
  let cached = storeProductsCache.get(storeId);
  if (!cached) {
    cached = unstable_cache(
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
    );
    storeProductsCache.set(storeId, cached);
  }
  return cached();
}