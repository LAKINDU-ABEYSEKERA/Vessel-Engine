import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { PlatformHeader } from '@/components/platform/platform-header';

const TIERS = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        blurb: 'For creators getting off the ground.',
        features: [
            '1 storefront',
            'Unlimited physical + digital products',
            'Stripe checkout',
            'Public subdomain',
        ],
        cta: 'Get started',
        highlight: false,
    },
    {
        name: 'Creator',
        price: '$19',
        period: 'per month',
        blurb: 'For creators with real volume.',
        features: [
            'Unlimited storefronts',
            'Custom domains',
            'Priority support',
            'Advanced analytics',
        ],
        cta: 'Start free trial',
        highlight: true,
    },
    {
        name: 'Studio',
        price: 'Contact us',
        period: '',
        blurb: 'For teams and agencies.',
        features: [
            'Everything in Creator',
            'Team seats',
            'SSO',
            'Dedicated infrastructure',
        ],
        cta: 'Talk to sales',
        highlight: false,
    },
];

export default function PricingPage() {
    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-zinc-100 selection:text-zinc-900">
            <PlatformHeader />

            <section className="mx-auto max-w-3xl px-6 py-20 text-center">
                <h1 className="text-5xl font-medium leading-tight tracking-tight md:text-6xl">
                    Simple, honest pricing
                </h1>
                <p className="mt-6 max-w-[52ch] mx-auto text-lg leading-relaxed text-zinc-400">
                    Start free. Upgrade when your storefront takes off. No
                    per-transaction fees on top of Stripe.
                </p>
            </section>

            <section className="mx-auto max-w-6xl px-6 pb-24">
                <div className="grid gap-6 lg:grid-cols-3">
                    {TIERS.map((tier) => (
                        <div
                            key={tier.name}
                            className={
                                'flex flex-col rounded-2xl border p-8 transition ' +
                                (tier.highlight
                                    ? 'border-zinc-100 bg-zinc-900'
                                    : 'border-zinc-800/80 bg-zinc-900/60')
                            }
                        >
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold tracking-tight">
                                    {tier.name}
                                </h2>
                                <p className="mt-1 text-sm text-zinc-400">
                                    {tier.blurb}
                                </p>
                            </div>

                            <div className="mb-6 flex items-baseline gap-2">
                                <span className="text-4xl font-medium tracking-tight">
                                    {tier.price}
                                </span>
                                {tier.period ? (
                                    <span className="text-sm text-zinc-500">
                                        {tier.period}
                                    </span>
                                ) : null}
                            </div>

                            <ul className="mb-8 flex flex-col gap-3">
                                {tier.features.map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-2 text-sm text-zinc-300"
                                    >
                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href="/app/login"
                                className={
                                    'mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition ' +
                                    (tier.highlight
                                        ? 'bg-zinc-100 text-zinc-900 hover:bg-white'
                                        : 'border border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-900')
                                }
                            >
                                {tier.cta}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}