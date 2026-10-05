import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

import { listAdminStripeEvents } from '../_queries';

function formatDateTime(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export default async function AdminStripeEventsPage() {
    const events = await listAdminStripeEvents();
    const pending = events.filter((e) => !e.processedAt).length;

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
                    Stripe events
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {events.length} most recent event{events.length === 1 ? '' : 's'}
                    {pending > 0 ? ` · ${pending} unprocessed` : ''}.
                </p>
            </header>

            {pending > 0 && (
                <div
                    role="alert"
                    className="flex items-start gap-2 p-3 mb-6 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900"
                >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                        {pending} event{pending === 1 ? '' : 's'} arrived but never
                        completed processing. Check the server logs — Stripe will
                        retry, but a persistent failure needs investigation.
                    </span>
                </div>
            )}

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-5 py-3 font-medium text-zinc-500">Event</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Type</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Received</th>
                            <th className="px-5 py-3 font-medium text-zinc-500">Status</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {events.map((e) => (
                            <tr key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20">
                                <td className="px-5 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                    {e.eventId}
                                </td>
                                <td className="px-5 py-3 text-zinc-900 dark:text-white">
                                    {e.type}
                                </td>
                                <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                                    {formatDateTime(e.createdAt)}
                                </td>
                                <td className="px-5 py-3">
                                    {e.processedAt ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                processed
                                            </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-500">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                pending
                                            </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {events.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-5 py-12 text-center text-zinc-500">
                                    No events recorded yet.
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