import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { and, eq, isNull } from 'drizzle-orm';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

import { auth } from '@/auth';
import { db } from '@/db';
import { stores } from '@/db/schema';

import { StoreSubNav } from './store-sub-nav';

export default async function StoreLayout({
                                              children,
                                              params,
                                          }: {
    children: React.ReactNode;
    params: Promise<{ subdomain: string }>;
}) {
    const { subdomain } = await params;
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/app/login');
    }

    const [store] = await db
        .select()
        .from(stores)
        .where(
            and(
                eq(stores.subdomain, subdomain),
                eq(stores.userId, session.user.id),
                isNull(stores.deletedAt)
            )
        )
        .limit(1);

    if (!store) {
        notFound();
    }

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* -------------------------------------------------------- */}
            {/* Store header                                              */}
            {/* -------------------------------------------------------- */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-8 pt-6 pb-0">
                {/* Back to stores */}
                <Link
                    href="/app"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-4"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All stores
                </Link>

                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white truncate">
                            {store.name}
                        </h1>
                        <p className="text-sm text-zinc-500 font-mono mt-1 truncate">
                            {store.subdomain}.vesselengine.com
                        </p>
                    </div>

                    <a
                        href={`http://${store.subdomain}.localhost:3000`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 shrink-0"
                    >
                        View storefront
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                </div>

                <StoreSubNav subdomain={subdomain} />
            </div>

            {/* -------------------------------------------------------- */}
            {/* Store content                                             */}
            {/* -------------------------------------------------------- */}
            <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
    );
}