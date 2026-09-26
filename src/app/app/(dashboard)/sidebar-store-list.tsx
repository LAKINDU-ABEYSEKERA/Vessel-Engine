'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

                return (
                    <li key={store.id}>
                        <Link
                            href={href}
                            className={
                                'flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ' +
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
                    </li>
                );
            })}
        </ul>
    );
}