import Link from 'next/link';
import { desc, isNull } from 'drizzle-orm';
import { AlertCircle, ArrowUpRight, Store as StoreIcon } from 'lucide-react';

import { db } from '@/db';
import { stores } from '@/db/schema';

export const dynamic = 'force-dynamic';

type StoreRow = {
    id: string;
    name: string;
    subdomain: string;
    createdAt: Date;
};

export default async function CustomerBrowsePage() {
    // Wrap the query so a transient DB failure doesn't crash the route.
    // We render an inline "temporarily unavailable" message instead of a
    // full-page runtime error overlay.
    let rows: StoreRow[] = [];
    let loadFailed = false;

    try {
        rows = await db
            .select({
                id: stores.id,
                name: stores.name,
                subdomain: stores.subdomain,
                createdAt: stores.createdAt,
            })
            .from(stores)
            .where(isNull(stores.deletedAt))
            .orderBy(desc(stores.createdAt));
    } catch (err) {
        console.error('[CustomerBrowsePage] stores query failed:', err);
        loadFailed = true;
    }

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Browse stores
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {loadFailed
                        ? 'Could not load storefronts right now.'
                        : rows.length === 0
                            ? 'No storefronts are live yet.'
                            : `${rows.length} storefront${rows.length === 1 ? '' : 's'} on Vessel Engine.`}
                </p>
            </header>

            {loadFailed ? (
                <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-red-300 dark:border-red-900/60 rounded-2xl">
                    <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
                    <h3 className="text-base font-medium text-zinc-900 dark:text-white">
                        Couldn&apos;t reach the database
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1 max-w-[46ch]">
                        The connection may be temporarily unavailable. Please refresh in a moment.
                    </p>
                </div>
            ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl">
                    <StoreIcon className="h-10 w-10 text-zinc-400 mb-4" />
                    <h3 className="text-base font-medium text-zinc-900 dark:text-white">
                        Nothing to browse yet
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                        Check back once sellers publish their storefronts.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((store) => {
                        const url = `http://${store.subdomain}.localhost:3000`;
                        return (
                            <Link
                                key={store.id}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-mono text-sm font-semibold text-zinc-500">
                                        {store.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition" />
                                </div>
                                <div>
                                    <h3 className="text-base font-medium text-zinc-900 dark:text-white truncate">
                                        {store.name}
                                    </h3>
                                    <p className="mt-0.5 font-mono text-[11px] text-zinc-500 truncate">
                                        {store.subdomain}.vesselengine.com
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}