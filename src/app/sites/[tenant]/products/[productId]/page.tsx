import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, Store } from 'lucide-react';

import { AddToCartButton } from '@/components/storefront/add-to-cart-button';
import { ProductTypeBadge, StockPill } from '@/components/storefront/product-card';
import { getStoreProduct, getTenantStore } from '@/db/queries/storefront';
import { PLATFORM_URL } from '@/lib/config';
import { formatUSD, normalizeProduct, normalizeStore } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ tenant: string; productId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { tenant, productId } = await params;
    const storeRecord = await getTenantStore(tenant);
    if (!storeRecord) return { title: 'Store not found' };

    const store = normalizeStore(storeRecord, tenant);
    const product = await getStoreProduct(store.id, productId);
    if (!product) return { title: `Not found · ${store.name}` };

    return {
        title: `${product.name} · ${store.name}`,
        description: product.description ?? undefined,
        openGraph: {
            title: product.name,
            description: product.description ?? undefined,
            siteName: store.name,
            images: product.imageUrl ? [product.imageUrl] : undefined,
            type: 'website',
        },
    };
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { tenant, productId } = await params;

    const storeRecord = await getTenantStore(tenant);
    if (!storeRecord) notFound();
    const store = normalizeStore(storeRecord, tenant);

    const raw = await getStoreProduct(store.id, productId);
    if (!raw) notFound();

    const product = normalizeProduct(raw);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-zinc-100 selection:text-zinc-900">
            <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {store.name}
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-6 py-12">
                <div className="grid gap-10 md:grid-cols-2">
                    <div className="relative aspect-square overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900">
                        {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center font-mono text-4xl text-zinc-700">
                                {product.name.slice(0, 2).toUpperCase()}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <ProductTypeBadge kind={product.kind} />

                        <h1 className="mt-5 text-3xl font-medium leading-tight tracking-tight text-white md:text-4xl">
                            {product.name}
                        </h1>

                        <p className="mt-4 font-mono text-3xl tabular-nums tracking-tight text-white">
                            {formatUSD(product.unitAmount)}
                        </p>

                        <div className="mt-4">
                            <StockPill product={product} />
                        </div>

                        {product.description ? (
                            <p className="mt-8 text-sm leading-relaxed text-zinc-400 whitespace-pre-line">
                                {product.description}
                            </p>
                        ) : null}

                        <ul className="mt-8 space-y-2 text-sm text-zinc-500">
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-500" />
                                {product.kind === 'digital'
                                    ? 'Instant delivery after checkout'
                                    : 'Ships from the seller within 2 business days'}
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-500" />
                                Secure Stripe checkout
                            </li>
                        </ul>

                        <div className="mt-10">
                            <AddToCartButton product={product} />
                        </div>
                    </div>
                </div>

                <footer className="mt-20 border-t border-zinc-800/80 pt-8">
                    <Link
                        href={PLATFORM_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-400 transition"
                    >
                        <Store className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Powered by
                        <span className="font-medium text-zinc-400">Vessel Engine</span>
                    </Link>
                </footer>
            </main>
        </div>
    );
}