import { unstable_cache } from 'next/cache';
import {
    and,
    asc,
    eq,
    isNull,
    type InferSelectModel,
} from 'drizzle-orm';

import { db } from '@/db';
import { categories, productCategories, products, stores } from '@/db/schema';

/* -------------------------------------------------------------------------- */
/*  Row types                                                                  */
/* -------------------------------------------------------------------------- */

type StoreRow = InferSelectModel<typeof stores>;
type ProductRow = InferSelectModel<typeof products>;
type CategoryRow = InferSelectModel<typeof categories>;

/* -------------------------------------------------------------------------- */
/*  Cache tag helpers                                                          */
/* -------------------------------------------------------------------------- */

export const storefrontTags = {
    store: (subdomain: string) => `store-${subdomain}`,
    products: (storeId: string) => `products-${storeId}`,
    categories: (storeId: string) => `categories-${storeId}`,
};

/* -------------------------------------------------------------------------- */
/*  Cache wrapper memoization                                                  */
/* -------------------------------------------------------------------------- */

const tenantStoreCache = new Map<string, () => Promise<StoreRow | null>>();
const storeProductsCache = new Map<string, () => Promise<ProductRow[]>>();
const storeCategoriesCache = new Map<string, () => Promise<CategoryRow[]>>();
const productsByCategoryCache = new Map<string, () => Promise<ProductRow[]>>();

/* -------------------------------------------------------------------------- */
/*  Queries                                                                    */
/* -------------------------------------------------------------------------- */

export async function getTenantStore(
    subdomain: string
): Promise<StoreRow | null> {
    let cached = tenantStoreCache.get(subdomain);
    if (!cached) {
        cached = unstable_cache(
            async () => {
                const [store] = await db
                    .select()
                    .from(stores)
                    .where(
                        and(
                            eq(stores.subdomain, subdomain),
                            isNull(stores.deletedAt)
                        )
                    )
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

export async function getStoreProducts(
    storeId: string
): Promise<ProductRow[]> {
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

export async function getStoreCategories(
    storeId: string
): Promise<CategoryRow[]> {
    let cached = storeCategoriesCache.get(storeId);
    if (!cached) {
        cached = unstable_cache(
            async () => {
                return db
                    .select()
                    .from(categories)
                    .where(eq(categories.storeId, storeId))
                    .orderBy(asc(categories.position), asc(categories.name));
            },
            ['store-categories', storeId],
            {
                tags: ['store-categories', storefrontTags.categories(storeId)],
                revalidate: 60,
            }
        );
        storeCategoriesCache.set(storeId, cached);
    }
    return cached();
}

export async function getStoreProductsByCategory(
    storeId: string,
    categorySlug: string
): Promise<ProductRow[]> {
    const cacheKey = `${storeId}:${categorySlug}`;
    let cached = productsByCategoryCache.get(cacheKey);
    if (!cached) {
        cached = unstable_cache(
            async () => {
                const rows = await db
                    .select({ product: products })
                    .from(products)
                    .innerJoin(
                        productCategories,
                        eq(productCategories.productId, products.id)
                    )
                    .innerJoin(
                        categories,
                        eq(categories.id, productCategories.categoryId)
                    )
                    .where(
                        and(
                            eq(products.storeId, storeId),
                            eq(categories.slug, categorySlug)
                        )
                    );
                return rows.map((r) => r.product);
            },
            ['products-by-category', storeId, categorySlug],
            {
                tags: [
                    'store-products',
                    storefrontTags.products(storeId),
                    storefrontTags.categories(storeId),
                ],
                revalidate: 60,
            }
        );
        productsByCategoryCache.set(cacheKey, cached);
    }
    return cached();
}