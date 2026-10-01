'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, LayoutDashboard, Package } from 'lucide-react';

const TABS = [
    { href: '/app/customer', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/app/customer/orders', label: 'My Orders', icon: Package, exact: false },
    { href: '/app/customer/browse', label: 'Browse Stores', icon: Compass, exact: false },
] as const;

export function CustomerNav() {
    const pathname = usePathname();

    return (
        <nav className="flex-1 px-3 py-4">
            <div className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Shopping
            </div>
            <ul className="space-y-0.5">
                {TABS.map(({ href, label, icon: Icon, exact }) => {
                    const isActive = exact
                        ? pathname === href
                        : pathname === href || pathname.startsWith(`${href}/`);
                    return (
                        <li key={href}>
                            <Link
                                href={href}
                                className={
                                    'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ' +
                                    (isActive
                                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white'
                                        : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100')
                                }
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}