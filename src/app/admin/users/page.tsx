import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { listAdminUsers } from '../_queries';

function formatDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

export default async function AdminUsersPage() {
    const users = await listAdminUsers();

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
                    Users
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {users.length} account{users.length === 1 ? '' : 's'}.
                </p>
            </header>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-5 py-3 font-medium text-zinc-500">Name</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Email</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Role</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Stores</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Joined</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {users.map((u) => (
                            <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20">
                                <td className="px-5 py-3 text-zinc-900 dark:text-white">
                                    {u.name ?? '—'}
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                                    {u.email ?? '—'}
                                </td>
                                <td className="px-5 py-3">
                                        <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-900 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                            {u.role}
                                        </span>
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 tabular-nums">
                                    {u.storeCount}
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                                    {formatDate(u.createdAt)}
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