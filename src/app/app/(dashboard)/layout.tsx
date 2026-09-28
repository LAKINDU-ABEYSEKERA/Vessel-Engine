import { eq, desc, isNull, and } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, Plus, Store } from 'lucide-react';

import { auth, signOut } from '@/auth';
import { db } from '@/db';
import { stores, users } from '@/db/schema';

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

    // Two queries in parallel: the store list and the user's avatar.
    // Both are cheap indexed lookups.
    const [userStores, currentUserRows] = await Promise.all([
        db
            .select({
                id: stores.id,
                name: stores.name,
                subdomain: stores.subdomain,
            })
            .from(stores)
            .where(
                and(eq(stores.userId, session.user.id), isNull(stores.deletedAt))
            )
            .orderBy(desc(stores.createdAt)),
        db
            .select({
                name: users.name,
                email: users.email,
                avatarUrl: users.avatarUrl,
                image: users.image,
            })
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1),
    ]);

    const currentUser = currentUserRows[0];
    const displayName = currentUser?.name ?? session.user.name ?? 'Account';
    const displayEmail = currentUser?.email ?? session.user.email ?? null;

    // Avatar precedence:
    //   1. User-uploaded avatarUrl (highest priority)
    //   2. OAuth-provided image (Google profile photo)
    //   3. Initial letter fallback
    const avatarSrc = currentUser?.avatarUrl ?? currentUser?.image ?? null;
    const initial = (displayName || displayEmail || '?').slice(0, 1).toUpperCase();

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
                <div className="border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                    <Link
                        href="/app/account"
                        className="flex flex-col items-center gap-3 px-4 pt-5 pb-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                        aria-label="Open account settings"
                    >
                        {avatarSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={avatarSrc}
                                alt=""
                                className="h-14 w-14 rounded-full object-cover bg-zinc-200 dark:bg-zinc-800 ring-2 ring-zinc-100 dark:ring-zinc-900"
                            />
                        ) : (
                            <div
                                className="h-14 w-14 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-xl font-semibold text-zinc-600 dark:text-zinc-300 ring-2 ring-zinc-100 dark:ring-zinc-900"
                                aria-hidden="true"
                            >
                                {initial}
                            </div>
                        )}

                        <div className="w-full min-w-0 text-center">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                {displayName}
                            </p>
                            {displayEmail && (
                                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                    {displayEmail}
                                </p>
                            )}
                        </div>
                    </Link>

                    <div className="px-4 pb-4">
                        <form
                            action={async () => {
                                'use server';
                                await signOut({ redirectTo: '/app/login' });
                            }}
                        >
                            <button
                                type="submit"
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                            >
                                <LogOut size={14} />
                                Log out
                            </button>
                        </form>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {children}
            </main>
        </div>
    );
}