import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { auth } from '@/auth';
import { db } from '@/db';
import { categories, stores } from '@/db/schema';

import { CategoryForm } from '../../category-form';

export default async function EditSectionPage({
                                                  params,
                                              }: {
    params: Promise<{ subdomain: string; categoryId: string }>;
}) {
    const { subdomain, categoryId } = await params;
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

    const [category] = await db
        .select()
        .from(categories)
        .where(
            and(eq(categories.id, categoryId), eq(categories.storeId, store.id))
        )
        .limit(1);

    if (!category) notFound();

    return (
        <CategoryForm
            subdomain={subdomain}
            initial={{
                id: category.id,
                name: category.name,
                slug: category.slug,
                type: category.type,
            }}
        />
    );
}