import Link from 'next/link';
import { ArrowRight, ExternalLink, Store } from 'lucide-react';

import { PlatformHeader } from '@/components/platform/platform-header';
import { tenantUrl } from '@/lib/config';

/**
 * Demo storefronts hardcoded so the platform page always has discoverable
 * links even on a fresh DB. In a real deployment, this would query for
 * stores with a `featured` flag.
 */
const DEMO_TENANTS = [
    { subdomain: 'acme', name: 'Acme Outfitters', blurb: 'Apparel, gear, and digital goods.' },
    { subdomain: 'artisan', name: 'Artisan Presets', blurb: 'Cinematic colour grading for photographers.' },
];

export default function PlatformPage() {
    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-zinc-100 selection:text-zinc-900">
            <PlatformHeader />

            {/* -------------------------------------------------------- */}
            {/* Hero                                                      */}
            {/* -------------------------------------------------------- */}
            <section className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center md:py-32">
                <h1 className="text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
                    Vessel Engine
                </h1>

                <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-zinc-400">
                    Powering headless commerce for the modern web. Spin up a
                    storefront, connect Stripe, and start selling in minutes.
                </p>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href="/app"
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-100 px-5 text-sm font-semibold text-zinc-900 transition hover:bg-white"
                    >
                        <Store className="h-4 w-4" />
                        Open creator dashboard
                        <ArrowRight className="h-4 w-4" />
                    </Link>

                    <Link
                        href={tenantUrl('acme')}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 text-sm font-medium text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900"
                    >
                        Visit a live storefront
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Live storefronts                                          */}
            {/* -------------------------------------------------------- */}
            <section className="border-t border-zinc-800/80">
                <div className="mx-auto max-w-6xl px-6 py-16">
                    <header className="mb-10">
                        <h2 className="text-2xl font-medium tracking-tight">
                            Live on Vessel
                        </h2>
                        <p className="mt-2 text-sm text-zinc-400">
                            Real storefronts running on the platform. Open any
                            of them in a new tab.
                        </p>
                    </header>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {DEMO_TENANTS.map((tenant) => (
                            <Link
                                key={tenant.subdomain}
                                href={tenantUrl(tenant.subdomain)}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 transition hover:border-zinc-700 hover:bg-zinc-900"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs tracking-tight text-zinc-400">
                                        {tenant.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-zinc-600 transition group-hover:text-zinc-300" />
                                </div>

                                <div>
                                    <h3 className="text-base font-medium tracking-tight text-zinc-100">
                                        {tenant.name}
                                    </h3>
                                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                                        {tenant.blurb}
                                    </p>
                                </div>

                                <p className="mt-auto font-mono text-[11px] tracking-tight text-zinc-600">
                                    {tenant.subdomain}.vesselengine.com
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}