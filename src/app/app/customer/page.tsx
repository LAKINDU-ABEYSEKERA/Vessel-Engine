import Link from 'next/link';
import { and, count, desc, eq, isNull, sql, sum } from 'drizzle-orm';
import { ArrowUpRight, Compass, Package, Receipt, Store } from 'lucide-react';

import { auth } from '@/auth';
import { db } from '@/db';
import { orders, stores } from '@/db/schema';

function formatMoney(cents: number | string | null): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(Number(cents ?? 0) / 100);
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

export default async function CustomerDashboardPage() {
    const session = await auth();
    const email = session?.user?.email ?? null;
    const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

    if (!email) {
        return null;
    }

    // Normalize the email once so all three queries use the same value.
    const normalizedEmail = email.toLowerCase();

    // Aggregate stats — scoped to this customer's email across all tenants.
    // The `lower()` comparison makes the match resilient to legacy rows
    // that stored the email with different casing.
    const [orderCountRow, totalSpentRow, recentOrders, featuredStores] =
        await Promise.all([
            db
                .select({ value: count() })
                .from(orders)
                .where(
                    sql`lower(${orders.customerEmail}) = ${normalizedEmail}`
                ),
            db
                .select({ value: sum(orders.totalAmountInCents) })
                .from(orders)
                .where(
                    and(
                        sql`lower(${orders.customerEmail}) = ${normalizedEmail}`,
                        eq(orders.status, 'completed')
                    )
                ),
            db
                .select({
                    id: orders.id,
                    totalAmount: orders.totalAmountInCents,
                    status: orders.status,
                    createdAt: orders.createdAt,
                    storeName: stores.name,
                    storeSubdomain: stores.subdomain,
                })
                .from(orders)
                .innerJoin(stores, eq(stores.id, orders.storeId))
                .where(
                    sql`lower(${orders.customerEmail}) = ${normalizedEmail}`
                )
                .orderBy(desc(orders.createdAt))
                .limit(5),
            db
                .select({
                    id: stores.id,
                    name: stores.name,
                    subdomain: stores.subdomain,
                })
                .from(stores)
                .where(isNull(stores.deletedAt))
                .orderBy(desc(stores.createdAt))
                .limit(6),
        ]);

    const orderCount = Number(orderCountRow[0]?.value ?? 0);
    const totalSpent = Number(totalSpentRow[0]?.value ?? 0);

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Hey, {firstName}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Here&apos;s what&apos;s new in your shopping world.
                </p>
            </header>

            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
                <StatCard
                    label="Orders placed"
                    value={orderCount.toString()}
                    icon={Receipt}
                    accent="indigo"
                />
                <StatCard
                    label="Total spent"
                    value={formatMoney(totalSpent)}
                    icon={Package}
                    accent="emerald"
                />
                <StatCard
                    label="Stores discovered"
                    value={featuredStores.length.toString()}
                    icon={Store}
                    accent="amber"
                />
            </div>

            {/* Recent orders */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden mb-8">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                            Recent orders
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Your last 5 purchases across every store.
                        </p>
                    </div>
                    <Link
                        href="/app/customer/orders"
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        View all
                        <ArrowUpRight className="h-3 w-3" />
                    </Link>
                </div>

                {recentOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
                            <Package className="h-6 w-6 text-zinc-400" />
                        </div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
                            No orders yet
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1 mb-4">
                            Browse a storefront to find something you love.
                        </p>
                        <Link
                            href="/app/customer/browse"
                            className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                            <Compass size={16} />
                            Browse stores
                        </Link>
                    </div>
                ) : (
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {recentOrders.map((order) => (
                            <li
                                key={order.id}
                                className="flex items-center gap-4 px-6 py-4"
                            >
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                                    <Receipt className="h-4 w-4 text-zinc-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                                        {order.storeName}
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-0.5">
                                        {formatDate(order.createdAt)}
                                    </div>
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                                    {order.status}
                                </div>
                                <div className="font-mono text-sm text-zinc-900 dark:text-white tabular-nums shrink-0">
                                    {formatMoney(order.totalAmount)}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Store discovery */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                            Discover stores
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Fresh storefronts on Vessel Engine.
                        </p>
                    </div>
                    <Link
                        href="/app/customer/browse"
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        See all
                        <ArrowUpRight className="h-3 w-3" />
                    </Link>
                </div>

                {featuredStores.length === 0 ? (
                    <div className="p-12 text-center text-sm text-zinc-500">
                        No stores yet — check back soon.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {featuredStores.map((store) => (
                            <Link
                                key={store.id}
                                href={`http://${store.subdomain}.localhost:3000`}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex flex-col gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-mono text-[11px] font-semibold text-zinc-500">
                                        {store.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                            {store.name}
                                        </p>
                                        <p className="text-[11px] text-zinc-500 font-mono truncate">
                                            {store.subdomain}
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                    Visit store
                                    <ArrowUpRight className="h-3 w-3" />
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({
                      label,
                      value,
                      icon: Icon,
                      accent,
                  }: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: 'indigo' | 'emerald' | 'amber';
}) {
    const accentClasses =
        accent === 'indigo'
            ? 'bg-indigo-500/10 text-indigo-400'
            : accent === 'emerald'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-amber-500/10 text-amber-400';

    return (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {label}
                </span>
                <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentClasses}`}
                >
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            <p className="text-3xl font-semibold text-zinc-900 dark:text-white tabular-nums">
                {value}
            </p>
        </div>
    );
}