import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, sql } from 'drizzle-orm';
import { ArrowLeft, Package, Receipt } from 'lucide-react';

import { auth } from '@/auth';
import { db } from '@/db';
import { orders, orderItems, products, stores } from '@/db/schema';

export const dynamic = 'force-dynamic';

function formatMoney(cents: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(cents / 100);
}

function formatDateTime(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export default async function CustomerOrderDetailPage({
                                                          params,
                                                      }: {
    params: Promise<{ orderId: string }>;
}) {
    const { orderId } = await params;
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email) notFound();

    // The lower() comparison matches how the orders list filters.
    // Ownership check: only the buyer's email can view this order.
    const [order] = await db
        .select({
            id: orders.id,
            total: orders.totalAmountInCents,
            status: orders.status,
            createdAt: orders.createdAt,
            customerEmail: orders.customerEmail,
            storeName: stores.name,
            storeSubdomain: stores.subdomain,
        })
        .from(orders)
        .innerJoin(stores, eq(stores.id, orders.storeId))
        .where(
            and(
                eq(orders.id, orderId),
                sql`lower(${orders.customerEmail}) = ${email}`
            )
        )
        .limit(1);

    if (!order) notFound();

    const lines = await db
        .select({
            id: orderItems.id,
            name: products.name,
            slug: products.slug,
            imageUrl: products.imageUrl,
            isDigital: products.isDigital,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPriceInCents,
        })
        .from(orderItems)
        .innerJoin(products, eq(products.id, orderItems.productId))
        .where(eq(orderItems.orderId, order.id))
        .orderBy(desc(orderItems.createdAt));

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-2xl">
                <Link
                    href="/app/customer/orders"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-6"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to orders
                </Link>

                <header className="mb-8">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                        {order.storeName}
                    </h1>
                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                        <span className="font-mono">
                            {order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span>·</span>
                        <span>{formatDateTime(order.createdAt)}</span>
                        <span>·</span>
                        <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-900 px-2.5 py-0.5 text-[11px] font-medium capitalize text-zinc-600 dark:text-zinc-400">
                            {order.status}
                        </span>
                    </div>
                </header>

                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden mb-6">
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {lines.map((line) => (
                            <li key={line.id} className="flex items-center gap-4 px-6 py-4">
                                <div className="h-12 w-12 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
                                    {line.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={line.imageUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <Package className="h-5 w-5 text-zinc-400" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                        {line.name}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        Qty {line.quantity}
                                        {line.isDigital ? ' · Digital' : ''}
                                    </p>
                                </div>
                                <p className="font-mono text-sm text-zinc-900 dark:text-white tabular-nums shrink-0">
                                    {formatMoney(line.unitPrice * line.quantity)}
                                </p>
                            </li>
                        ))}
                    </ul>

                    <div className="flex items-baseline justify-between border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Total paid
                        </span>
                        <span className="font-mono text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
                            {formatMoney(order.total)}
                        </span>
                    </div>
                </section>

                <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Receipt className="h-3.5 w-3.5" />
                    <span>
                        A receipt was emailed to{' '}
                        <span className="font-mono">
                            {order.customerEmail ?? 'your account'}
                        </span>
                        .
                    </span>
                </div>
            </div>
        </div>
    );
}