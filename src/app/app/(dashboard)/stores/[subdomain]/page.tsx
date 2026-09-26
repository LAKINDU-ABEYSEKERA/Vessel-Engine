import { and, count, eq, isNull } from 'drizzle-orm';
import { Package } from 'lucide-react';

import { auth } from '@/auth';
import { db } from '@/db';
import { stores, products } from '@/db/schema';

export default async function StoreOverviewPage({
                                                    params,
                                                }: {
    params: Promise<{ subdomain: string }>;
}) {
    const { subdomain } = await params;
    const session = await auth();

    const [store] = await db
        .select()
        .from(stores)
        .where(
            and(
                eq(stores.subdomain, subdomain),
                eq(stores.userId, session!.user.id),
                isNull(stores.deletedAt)
            )
        )
        .limit(1);

    // Layout already checked, but TS doesn't know.
    if (!store) return null;

    const [{ value: productCount }] = await db
        .select({ value: count() })
        .from(products)
        .where(eq(products.storeId, store.id));

    const digitalCount = await db
        .select({ value: count() })
        .from(products)
        .where(and(eq(products.storeId, store.id), eq(products.isDigital, true)));

    return (
        <div className="p-8">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                Store overview
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
                A snapshot of what's happening on this storefront.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    label="Products"
                    value={productCount}
                    hint={`${digitalCount[0]?.value ?? 0} digital · ${
                        productCount - (digitalCount[0]?.value ?? 0)
                    } physical`}
                />
            </div>
        </div>
    );
}

function StatCard({
                      label,
                      value,
                      hint,
                  }: {
    label: string;
    value: number;
    hint?: string;
}) {
    return (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {label}
                </span>
                <Package className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="text-3xl font-semibold text-zinc-900 dark:text-white tabular-nums">
                {value}
            </p>
            {hint ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{hint}</p>
            ) : null}
        </div>
    );
}