'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LayoutGrid, Package, Settings } from 'lucide-react';

const TABS = [
    { segment: '', label: 'Overview', icon: LayoutDashboard },
    { segment: 'products', label: 'Products', icon: Package },
    { segment: 'sections', label: 'Sections', icon: LayoutGrid },
    { segment: 'settings', label: 'Settings', icon: Settings },
] as const;

export function StoreSubNav({ subdomain }: { subdomain: string }) {
    const pathname = usePathname();
    const base = `/app/stores/${subdomain}`;

    return (
        <nav className="flex items-center gap-1 mt-5">
            {TABS.map(({ segment, label, icon: Icon }) => {
                const href = segment ? `${base}/${segment}` : base;
                const isActive =
                    segment === ''
                        ? pathname === base
                        : pathname.startsWith(`${base}/${segment}`);

                return (
                    <Link
                        key={segment || 'overview'}
                        href={href}
                        className={
                            'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' +
                            (isActive
                                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white'
                                : 'text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100')
                        }
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}