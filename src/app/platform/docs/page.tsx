import Link from 'next/link';
import { ArrowRight, Book, Code, Rocket, ShieldCheck } from 'lucide-react';

import { PlatformHeader } from '@/components/platform/platform-header';

const SECTIONS = [
    {
        icon: Rocket,
        title: 'Getting started',
        blurb: 'Create a storefront, add your first product, and go live in under five minutes.',
        href: '/app',
    },
    {
        icon: Code,
        title: 'API reference',
        blurb: 'Server actions, webhook handlers, and the Drizzle schema for advanced integrations.',
        href: '/app',
    },
    {
        icon: ShieldCheck,
        title: 'Fulfilment',
        blurb: 'How digital delivery and physical inventory work end-to-end with Stripe.',
        href: '/app',
    },
    {
        icon: Book,
        title: 'Multi-tenancy',
        blurb: 'Subdomain routing, custom domains, and the soft-delete lifecycle.',
        href: '/app',
    },
];

export default function DocsPage() {
    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-zinc-100 selection:text-zinc-900">
            <PlatformHeader />

            <section className="mx-auto max-w-3xl px-6 py-20">
                <h1 className="text-5xl font-medium leading-tight tracking-tight md:text-6xl">
                    Documentation
                </h1>
                <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-zinc-400">
                    Everything you need to understand how Vessel Engine works,
                    from tenant routing to Stripe fulfilment.
                </p>
            </section>

            <section className="mx-auto max-w-6xl px-6 pb-24">
                <div className="grid gap-5 sm:grid-cols-2">
                    {SECTIONS.map((section) => {
                        const Icon = section.icon;
                        return (
                            <Link
                                key={section.title}
                                href={section.href}
                                className="group flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 transition hover:border-zinc-700 hover:bg-zinc-900"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-medium tracking-tight text-zinc-100">
                                        {section.title}
                                    </h2>
                                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                                        {section.blurb}
                                    </p>
                                </div>
                                <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition group-hover:text-zinc-300">
                                    Open
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}