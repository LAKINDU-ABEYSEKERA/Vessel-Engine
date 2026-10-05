import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import { listAdminStores } from '../_queries';

function formatDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

export default async function AdminStoresPage() {
    const stores = await listAdminStores();

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
                    Stores
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {stores.length} store{stores.length === 1 ? '' : 's'}{' '}
                    (includes soft-deleted).
                </p>
            </header>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-5 py-3 font-medium text-zinc-500">Store</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Owner</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Products</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Orders</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Created</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Status</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {stores.map((s) => (
                            <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                            <span className="font-medium text-zinc-900 dark:text-white">
                                                {s.name}
                                            </span>
                                        <a
                                            href={`https://${s.subdomain}.vesselengine.com`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                            aria-label={`Open ${s.name}`}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </div>
                                    <div className="text-xs text-zinc-500 font-mono mt-0.5">
                                        {s.subdomain}
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                                    {s.ownerEmail ?? '—'}
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 tabular-nums">
                                    {s.productCount}
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 tabular-nums">
                                    {s.orderCount}
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                                    {formatDate(s.createdAt)}
                                </td>
                                <td className="px-5 py-3">
                                    {s.deletedAt ? (
                                        <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-red-500">
                                                Deleted
                                            </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-500">
                                                Active
                                            </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}