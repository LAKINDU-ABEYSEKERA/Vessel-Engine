import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { LogOut, ShoppingBag } from 'lucide-react';

import { auth, signOut } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { CustomerNav } from '@/components/customer/customer-nav';

export const dynamic = 'force-dynamic';

export default async function CustomerLayout({
                                                 children,
                                             }: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session?.user) redirect('/app/login');

    // ------------------------------------------------------------------
    // Fetch the profile fields we need for the sidebar.
    //
    // The query is wrapped in try/catch so a DB hiccup doesn't take down
    // the whole customer shell — we fall back to session-derived values
    // (which are always available) and log the real error server-side.
    // ------------------------------------------------------------------
    let profile: {
        name: string | null;
        email: string | null;
        avatarUrl: string | null;
        image: string | null;
        role: string;
    } | null = null;

    try {
        const [row] = await db
            .select({
                name: users.name,
                email: users.email,
                avatarUrl: users.avatarUrl,
                image: users.image,
                role: users.role,
            })
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1);

        profile = row ?? null;
    } catch (err) {
        // Log the real error for the operator. The page still renders.
        console.error('[CustomerLayout] profile query failed:', err);
    }

    // Fall back to session values when the DB is unreachable or the
    // row is missing. This keeps the navigation shell usable.
    const displayName = profile?.name ?? session.user.name ?? 'Account';
    const displayEmail = profile?.email ?? session.user.email ?? null;
    const avatarSrc = profile?.avatarUrl ?? profile?.image ?? null;

    // Sellers shouldn't sit in the customer shell — send them home.
    // Only enforce this when we actually know the role (i.e. the query
    // succeeded). If it failed, we don't have enough info to redirect —
    // better to render the page than to bounce someone to /app on a
    // transient DB failure.
    if (profile?.role === 'seller' || profile?.role === 'admin') {
        redirect('/app');
    }

    const initial = (displayName || displayEmail || '?').slice(0, 1).toUpperCase();

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
            <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-col hidden md:flex">
                <div className="h-16 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                    <Link
                        href="/app/customer"
                        className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-medium tracking-tight hover:opacity-80 transition-opacity"
                    >
                        <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-1.5 rounded-lg">
                            <ShoppingBag size={16} />
                        </div>
                        Vessel Engine
                    </Link>
                </div>

                <CustomerNav />

                <div className="border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                    <Link
                        href="/app/customer/account"
                        className="flex flex-col items-center gap-3 px-4 pt-5 pb-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                        {avatarSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={avatarSrc}
                                alt=""
                                className="h-14 w-14 rounded-full object-cover bg-zinc-200 dark:bg-zinc-800 ring-2 ring-zinc-100 dark:ring-zinc-900"
                            />
                        ) : (
                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-xl font-semibold text-zinc-600 dark:text-zinc-300 ring-2 ring-zinc-100 dark:ring-zinc-900">
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