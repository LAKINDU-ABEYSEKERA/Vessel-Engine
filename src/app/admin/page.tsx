import {
    ShoppingCart,
    Store,
    Users,
    Webhook,
    type LucideIcon,
} from 'lucide-react';

interface Section {
    icon: LucideIcon;
    title: string;
    blurb: string;
}

const SECTIONS: Section[] = [
    {
        icon: Users,
        title: 'Users',
        blurb: 'Browse all registered accounts and manage roles.',
    },
    {
        icon: Store,
        title: 'Stores',
        blurb: 'Review every storefront on the platform.',
    },
    {
        icon: ShoppingCart,
        title: 'Orders',
        blurb: 'Cross-tenant order history and reconciliation.',
    },
    {
        icon: Webhook,
        title: 'Stripe events',
        blurb: 'Inspect the raw webhook log and retry failures.',
    },
];

export default function AdminHomePage() {
    return (
        <div>
            <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Admin
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Platform-wide visibility. The sections below are stubs —
                    underlying queries will land in a follow-up.
                </p>
            </header>

            <div className="grid gap-5 sm:grid-cols-2">
                {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    return (
                        <div
                            key={section.title}
                            className="flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                                <Icon className="h-5 w-5 text-zinc-500" />
                            </div>
                            <div>
                                <h2 className="text-base font-medium tracking-tight text-zinc-900 dark:text-white">
                                    {section.title}
                                </h2>
                                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                    {section.blurb}
                                </p>
                            </div>
                            <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                                Coming soon
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}