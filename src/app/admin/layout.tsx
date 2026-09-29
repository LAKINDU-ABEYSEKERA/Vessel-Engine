import Link from 'next/link';
import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react';

import { requireRole } from '@/lib/auth-guards';
import { signOut } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    // Redirects to /app/login if unauthenticated; 404s if not admin.
    await requireRole('admin');

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
            <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-medium tracking-tight hover:opacity-80 transition-opacity"
                        >
                            <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-1.5 rounded-lg">
                                <ShieldCheck size={16} />
                            </div>
                            Vessel Engine
                        </Link>
                        <span className="inline-flex items-center rounded-full border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Admin
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <Link
                            href="/app"
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to dashboard
                        </Link>
                        <form
                            action={async () => {
                                'use server';
                                await signOut({ redirectTo: '/app/login' });
                            }}
                        >
                            <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
    );
}