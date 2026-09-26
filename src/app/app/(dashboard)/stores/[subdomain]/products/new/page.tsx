import { eq } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import { categories, stores } from '@/db/schema';
import { normalizeCategory } from '@/lib/storefront';

import { ProductForm } from '../product-form';

export default async function NewProductPage({
                                                 params,
                                             }: {
    params: Promise<{ subdomain: string }>;
}) {
    const { subdomain } = await params;
    const session = await auth();
    if (!session?.user?.id) return null;

    const [store] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.subdomain, subdomain))
        .limit(1);

    if (!store) return null;

    const cats = await db
        .select()
        .from(categories)
        .where(eq(categories.storeId, store.id));

    return (
        <ProductForm
            subdomain={subdomain}
            categories={cats.map(normalizeCategory)}
        />
    );
}