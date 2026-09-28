'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

import { tenantUrl } from '@/lib/config';

interface SidebarStore {
    id: string;
    name: string;
    subdomain: string;
}

export function SidebarStoreList({ stores }: { stores: SidebarStore[] }) {
    const pathname = usePathname();

    return (
        <ul className="space-y-0.5">
            {stores.map((store) => {
                const href = `/app/stores/${store.subdomain}`;
                const isActive =
                    pathname === href || pathname.startsWith(`${href}/`);
                const storefrontUrl = tenantUrl(store.subdomain);

                return (
                    <li key={store.id} className="group relative">
                        <Link
                            href={href}
                            className={
                                'flex items-center gap-2.5 pl-2 pr-8 py-2 rounded-lg transition-colors ' +
                                (isActive
                                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white'
                                    : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100')
                            }
                        >
                            <span
                                className={
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-semibold ' +
                                    (isActive
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400')
                                }
                            >
                                {store.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate text-sm font-medium">
                                {store.name}
                            </span>
                        </Link>

                        <a
                            href={storefrontUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${store.name} storefront in new tab`}
                            title="Open storefront"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 opacity-0 transition hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-400/70"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </li>
                );
            })}
        </ul>
    );
}