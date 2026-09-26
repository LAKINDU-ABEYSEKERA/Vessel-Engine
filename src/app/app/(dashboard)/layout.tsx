import { eq, desc, isNull, and } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, Plus, Store } from 'lucide-react';

import { auth, signOut } from '@/auth';
import { db } from '@/db';
import { stores } from '@/db/schema';

import { SidebarStoreList } from './sidebar-store-list';

export default async function DashboardLayout({
                                                  children,
                                              }: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect('/app/login');
    }
    const userStores = await db
        .select({
            id: stores.id,
            name: stores.name,
            subdomain: stores.subdomain,
        })
        .from(stores)
        .where(
            and(eq(stores.userId, session.user.id), isNull(stores.deletedAt))
        )
        .orderBy(desc(stores.createdAt));

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
            <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col hidden md:flex">
                {/* Brand */}
                <div className="h-16 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                    <Link
                        href="/app"
                        className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-medium tracking-tight hover:opacity-80 transition-opacity"
                    >
                        <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-1.5 rounded-lg">
                            <Store size={16} />
                        </div>
                        Vessel Engine
                    </Link>
                </div>

                {/* Store list */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <div className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        My Stores
                    </div>

                    {userStores.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                            No stores yet.
                        </p>
                    ) : (
                        <SidebarStoreList stores={userStores} />
                    )}

                    <Link
                        href="/app?new=1"
                        className="mt-1 flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-lg text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                        <Plus size={14} />
                        Add store
                    </Link>
                </nav>

                {/* Profile + logout */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center gap-3 px-1 py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={session.user.image || ''}
                            alt=""
                            className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                {session.user.name}
                            </p>
                        </div>
                    </div>
                    <form
                        action={async () => {
                            'use server';
                            await signOut({ redirectTo: '/app/login' });
                        }}
                    >
                        <button
                            type="submit"
                            className="flex w-full items-center gap-3 px-3 py-2 mt-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        >
                            <LogOut size={16} />
                            Log out
                        </button>
                    </form>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {children}
            </main>
        </div>
    );
}