import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { listAdminOrders } from '../_queries';

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

export default async function AdminOrdersPage() {
    const orders = await listAdminOrders();

    return (
        <div>
            <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-6"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Admin home
            </Link>

            <header className="mb-6">
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Orders
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {orders.length} most recent order{orders.length === 1 ? '' : 's'}.
                </p>
            </header>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-5 py-3 font-medium text-zinc-500">Order</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Store</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Customer</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Amount</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Status</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Placed</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {orders.map((o) => (
                            <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20">
                                <td className="px-5 py-3 font-mono text-xs text-zinc-900 dark:text-white">
                                    {o.id.slice(0, 8).toUpperCase()}
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                                    {o.storeName}
                                    <div className="text-xs font-mono text-zinc-500">
                                        {o.storeSubdomain}
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                                    {o.customerEmail ?? '—'}
                                </td>
                                <td className="px-5 py-3 font-mono text-zinc-900 dark:text-white tabular-nums">
                                    {formatMoney(o.totalAmountInCents)}
                                </td>
                                <td className="px-5 py-3">
                                        <span
                                            className={
                                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ' +
                                                (o.status === 'completed'
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-zinc-500/10 text-zinc-500')
                                            }
                                        >
                                            {o.status}
                                        </span>
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                                    {formatDateTime(o.createdAt)}
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                                    No orders yet.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}