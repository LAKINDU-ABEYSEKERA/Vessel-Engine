import Link from 'next/link';
import {
    ArrowRight,
    ShoppingCart,
    Store,
    Users,
    Webhook,
    type LucideIcon,
} from 'lucide-react';

import { countAdmin } from './_queries';

interface Section {
    icon: LucideIcon;
    title: string;
    blurb: string;
    href: string;
    count: number;
    countLabel: string;
    warn?: boolean;
}

export default async function AdminHomePage() {
    const stats = await countAdmin();

    const sections: Section[] = [
        {
            icon: Users,
            title: 'Users',
            blurb: 'Browse all registered accounts and manage roles.',
            href: '/admin/users',
            count: stats.users,
            countLabel: stats.users === 1 ? 'user' : 'users',
        },
        {
            icon: Store,
            title: 'Stores',
            blurb: 'Review every storefront on the platform.',
            href: '/admin/stores',
            count: stats.stores,
            countLabel: stats.stores === 1 ? 'active store' : 'active stores',
        },
        {
            icon: ShoppingCart,
            title: 'Orders',
            blurb: 'Cross-tenant order history and reconciliation.',
            href: '/admin/orders',
            count: stats.orders,
            countLabel: stats.orders === 1 ? 'order' : 'orders',
        },
        {
            icon: Webhook,
            title: 'Stripe events',
            blurb: 'Inspect the raw webhook log and retry failures.',
            href: '/admin/stripe-events',
            count: stats.pendingEvents,
            countLabel:
                stats.pendingEvents === 1
                    ? 'unprocessed event'
                    : 'unprocessed events',
            warn: stats.pendingEvents > 0,
        },
    ];

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Admin
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Platform-wide visibility.
                </p>
            </header>

            <div className="grid gap-5 sm:grid-cols-2">
                {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <Link
                            key={section.title}
                            href={section.href}
                            className="group flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm transition hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                                    <Icon className="h-5 w-5 text-zinc-500" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-900 dark:group-hover:text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-medium tracking-tight text-zinc-900 dark:text-white">
                                    {section.title}
                                </h2>
                                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                    {section.blurb}
                                </p>
                            </div>
                            <span
                                className={
                                    'mt-auto inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider ' +
                                    (section.warn
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-zinc-400 dark:text-zinc-600')
                                }
                            >
                                {section.count} {section.countLabel}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}