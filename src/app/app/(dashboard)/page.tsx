import { and, eq, desc, inArray, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowUpRight, Package, Store } from 'lucide-react';

import { auth } from '@/auth';
import { db } from '@/db';
import { stores, products } from '@/db/schema';

import { CreateStoreForm } from './create-store-form';
import { AddStoreToggle } from './add-store-toggle';

export default async function CreatorDashboardPage({
                                                       searchParams,
                                                   }: {
    searchParams: Promise<{ new?: string }>;
}) {
    const session = await auth();
    const userId = session?.user?.id;
    const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

    const params = await searchParams;
    const forceOpenForm = params.new === '1';

    const userStores = userId
        ? await db
            .select()
            .from(stores)
            .where(and(eq(stores.userId, userId), isNull(stores.deletedAt)))
            .orderBy(desc(stores.createdAt))
        : [];

    // ------------------------------------------------------------------
    // State 1 — Onboarding (no stores yet)
    // ------------------------------------------------------------------
    if (userStores.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950/50">
                <CreateStoreForm />
            </div>
        );
    }

    // ------------------------------------------------------------------
    // State 2 — Grid of stores + optional add form
    // ------------------------------------------------------------------
    const storeIds = userStores.map((s) => s.id);

    const productRows = await db
        .select({ storeId: products.storeId })
        .from(products)
        .where(inArray(products.storeId, storeIds));

    const countByStore = new Map<string, number>();
    for (const row of productRows) {
        countByStore.set(row.storeId, (countByStore.get(row.storeId) ?? 0) + 1);
    }

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Welcome back, {firstName}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {userStores.length === 1
                        ? 'You have 1 storefront.'
                        : `You have ${userStores.length} storefronts.`}
                </p>
            </header>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {userStores.map((store) => (
                    <Link
                        key={store.id}
                        href={`/app/stores/${store.subdomain}`}
                        className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm transition hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md"
                    >
                        <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                                <Store className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-semibold text-zinc-900 dark:text-white truncate">
                                    {store.name}
                                </h2>
                                <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                                    {store.subdomain}.vesselengine.com
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                                <Package className="h-3.5 w-3.5" />
                                {countByStore.get(store.id) ?? 0}{' '}
                                {(countByStore.get(store.id) ?? 0) === 1
                                    ? 'product'
                                    : 'products'}
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline">
                                Manage
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="mt-8">
                <AddStoreToggle initialOpen={forceOpenForm} />
            </div>
        </div>
    );
}