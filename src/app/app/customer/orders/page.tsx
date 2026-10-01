import Link from 'next/link';
import {desc, eq, sql} from 'drizzle-orm';
import { Package, Receipt, ShoppingBag } from 'lucide-react';

import { auth } from '@/auth';
import { db } from '@/db';
import { orders, stores } from '@/db/schema';

export const dynamic = 'force-dynamic';

function formatMoney(cents: number | string | null): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(Number(cents ?? 0) / 100);
}

function formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export default async function CustomerOrdersPage() {
    const session = await auth();
    const email = session?.user?.email ?? null;

    if (!email) return null;

    const rows = await db
        .select({
            id: orders.id,
            totalAmount: orders.totalAmountInCents,
            status: orders.status,
            createdAt: orders.createdAt,
            customerEmail: orders.customerEmail,
            storeName: stores.name,
            storeSubdomain: stores.subdomain,
        })
        .from(orders)
        .innerJoin(stores, eq(stores.id, orders.storeId))
        .where(sql`lower(${orders.customerEmail}) = ${email.toLowerCase()}`)
        .orderBy(desc(orders.createdAt));

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    My orders
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Every purchase you&apos;ve made across all Vessel storefronts.
                </p>
            </header>

            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
                            <ShoppingBag className="h-6 w-6 text-zinc-400" />
                        </div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
                            No orders yet
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1 mb-4">
                            When you buy something, it&apos;ll show up here.
                        </p>
                        <Link
                            href="/app/customer/browse"
                            className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                            Browse stores
                        </Link>
                    </div>
                ) : (
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {rows.map((order) => (
                            <li
                                key={order.id}
                                className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors"
                            >
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                                    <Receipt className="h-4 w-4 text-zinc-400" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                                        {order.storeName}
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-0.5 font-mono">
                                        {order.id.slice(0, 8).toUpperCase()} ·{' '}
                                        {formatDateTime(order.createdAt)}
                                    </div>
                                </div>

                                <span
                                    className={
                                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize shrink-0 ' +
                                        (order.status === 'completed'
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-zinc-500/10 text-zinc-400')
                                    }
                                >
                                    {order.status}
                                </span>

                                <div className="font-mono text-sm text-zinc-900 dark:text-white tabular-nums shrink-0 w-24 text-right">
                                    {formatMoney(order.totalAmount)}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}