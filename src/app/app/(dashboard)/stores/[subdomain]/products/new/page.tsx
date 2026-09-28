import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';

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
    if (!session?.user?.id) notFound();

    const [store] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(
            and(
                eq(stores.subdomain, subdomain),
                eq(stores.userId, session.user.id),
                isNull(stores.deletedAt)
            )
        )
        .limit(1);

    if (!store) notFound();

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