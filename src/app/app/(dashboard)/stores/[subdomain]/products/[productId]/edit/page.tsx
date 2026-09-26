import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { auth } from '@/auth';
import { db } from '@/db';
import { categories, productCategories, stores, products } from '@/db/schema';
import { normalizeCategory } from '@/lib/storefront';

import { ProductForm } from '../../product-form';

export default async function EditProductPage({
                                                  params,
                                              }: {
    params: Promise<{ subdomain: string; productId: string }>;
}) {
    const { subdomain, productId } = await params;
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

    const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
        .limit(1);

    if (!product) notFound();

    const [cats, linked] = await Promise.all([
        db.select().from(categories).where(eq(categories.storeId, store.id)),
        db
            .select({ categoryId: productCategories.categoryId })
            .from(productCategories)
            .where(eq(productCategories.productId, productId)),
    ]);

    return (
        <ProductForm
            subdomain={subdomain}
            categories={cats.map(normalizeCategory)}
            initial={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                priceInCents: product.priceInCents,
                inventory: product.inventory,
                isDigital: product.isDigital,
                assetUrl: product.assetUrl,
                imageUrl: product.imageUrl,
                categoryIds: linked.map((l) => l.categoryId),
            }}
        />
    );
}