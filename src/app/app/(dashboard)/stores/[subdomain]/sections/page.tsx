import { and, asc, count, eq, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { LayoutGrid, Pencil, Plus } from 'lucide-react';

import { auth } from '@/auth';
import { db } from '@/db';
import { categories, productCategories, stores } from '@/db/schema';
import { CATEGORY_TYPE_META } from '@/lib/categories';

import { DeleteCategoryButton } from './delete-category-button';

export default async function StoreSectionsPage({
                                                    params,
                                                }: {
    params: Promise<{ subdomain: string }>;
}) {
    const { subdomain } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const [store] = await db
        .select()
        .from(stores)
        .where(and(eq(stores.subdomain, subdomain), isNull(stores.deletedAt)))
        .limit(1);

    if (!store || store.userId !== userId) return null;

    const rows = await db
        .select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            type: categories.type,
            position: categories.position,
        })
        .from(categories)
        .where(eq(categories.storeId, store.id))
        .orderBy(asc(categories.position), asc(categories.name));

    // Product count per category
    const counts = await db
        .select({
            categoryId: productCategories.categoryId,
            count: count(),
        })
        .from(productCategories)
        .groupBy(productCategories.categoryId);

    const countByCategory = new Map<string, number>();
    for (const c of counts) {
        countByCategory.set(c.categoryId, Number(c.count));
    }

    return (
        <div className="p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                        Sections
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Group products for navigation. A product can be in many sections.
                    </p>
                </div>
                <Link
                    href={`/app/stores/${subdomain}/sections/new`}
                    className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                    <Plus size={16} />
                    Add section
                </Link>
            </header>

            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
                            <LayoutGrid className="h-6 w-6 text-zinc-400" />
                        </div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
                            No sections yet
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1 mb-4">
                            Create sections to organize your products.
                        </p>
                        <Link
                            href={`/app/stores/${subdomain}/sections/new`}
                            className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                            <Plus size={16} />
                            Add section
                        </Link>
                    </div>
                ) : (
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {rows.map((row) => {
                            const meta = CATEGORY_TYPE_META[
                                row.type as keyof typeof CATEGORY_TYPE_META
                                ] ?? CATEGORY_TYPE_META.other;
                            const Icon = meta.icon;
                            const productCount = countByCategory.get(row.id) ?? 0;

                            return (
                                <li
                                    key={row.id}
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors"
                                >
                                    <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
                                    >
                                        <Icon className={`h-5 w-5 ${meta.color}`} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium text-zinc-900 dark:text-white truncate">
                                            {row.name}
                                        </div>
                                        <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                                            {row.slug} · {meta.label}
                                        </div>
                                    </div>

                                    <div className="text-sm text-zinc-500 dark:text-zinc-400 shrink-0">
                                        {productCount}{' '}
                                        {productCount === 1 ? 'product' : 'products'}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <Link
                                            href={`/app/stores/${subdomain}/sections/${row.id}/edit`}
                                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Edit
                                        </Link>
                                        <DeleteCategoryButton
                                            subdomain={subdomain}
                                            categoryId={row.id}
                                            categoryName={row.name}
                                            productCount={productCount}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}