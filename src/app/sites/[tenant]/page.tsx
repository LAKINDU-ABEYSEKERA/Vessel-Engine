import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ShieldCheck, Store } from 'lucide-react';
import { Toaster } from 'sonner';
import { PLATFORM_URL } from '@/lib/config';
import { CartButton } from '@/components/storefront/cart-button';
import { CheckoutCanceledToast } from '@/components/storefront/checkout-canceled-toast';
import { EmptyCatalog } from '@/components/storefront/empty-catalog';
import { ProductCard } from '@/components/storefront/product-card';
import {
    getStoreCategories,
    getStoreProducts,
    getStoreProductsByCategory,
    getTenantStore,
} from '@/db/queries/storefront';
import {
    normalizeCategory,
    normalizeProduct,
    normalizeStore,
    storeHostname,
    type StoreCategory,
} from '@/lib/storefront';

import { CategoryChips } from './category-chips';
import Link from "next/link";

export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ tenant: string }>;
    searchParams: Promise<{ section?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { tenant } = await params;
    const record = await getTenantStore(tenant);

    if (!record) return { title: 'Store not found' };

    const store = normalizeStore(record, tenant);

    return {
        title: store.name,
        description: store.description ?? `Shop the ${store.name} collection.`,
        openGraph: {
            title: store.name,
            description: store.description ?? `Shop the ${store.name} collection.`,
            siteName: store.name,
            type: 'website',
        },
    };
}

export default async function TenantStorefrontPage({
                                                       params,
                                                       searchParams,
                                                   }: PageProps) {
    const { tenant } = await params;
    const { section } = await searchParams;

    const storeRecord = await getTenantStore(tenant);
    if (!storeRecord) notFound();

    const store = normalizeStore(storeRecord, tenant);

    const [rawCategories, rawProducts, rawFiltered] = await Promise.all([
        getStoreCategories(store.id),
        getStoreProducts(store.id),
        section
            ? getStoreProductsByCategory(store.id, section)
            : Promise.resolve(null),
    ]);

    const categories: StoreCategory[] = rawCategories.map(normalizeCategory);
    const allProducts = rawProducts.map(normalizeProduct);
    const visibleProducts = rawFiltered
        ? rawFiltered.map(normalizeProduct)
        : allProducts;

    const activeCategory: StoreCategory | null = section
        ? categories.find((c) => c.slug === section) ?? null
        : null;

    const digitalCount = visibleProducts.filter(
        (p) => p.kind === 'digital'
    ).length;
    const physicalCount = visibleProducts.length - digitalCount;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-zinc-100 selection:text-zinc-900">
            <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900">
                            {store.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={store.logoUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="font-mono text-xs tracking-tight text-zinc-400">
                                    {store.name.slice(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>

                        <div className="flex min-w-0 items-center gap-2.5">
                            <span className="truncate text-sm font-medium tracking-tight text-zinc-100">
                                {store.name}
                            </span>
                            <span className="hidden items-center gap-1.5 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-2.5 py-1 font-mono text-[11px] tracking-tight text-zinc-400 sm:inline-flex">
                                <span
                                    className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                                    aria-hidden="true"
                                />
                                {storeHostname(store)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <CartButton />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-6">
                <section className="border-b border-zinc-800/80 py-20 md:py-28">
                    <h1 className="max-w-[16ch] text-4xl font-medium leading-[1.05] tracking-tight text-zinc-100 md:text-6xl">
                        {activeCategory ? activeCategory.name : store.name}
                    </h1>

                    <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-zinc-400 md:text-lg">
                        {store.description ??
                            'A small, considered collection. Everything here is made to be used.'}
                    </p>

                    <div className="mt-9 flex flex-wrap items-center gap-2">
                        <MetaPill>
                            <span className="font-mono tabular-nums text-zinc-200">
                                {visibleProducts.length}
                            </span>
                            {visibleProducts.length === 1 ? 'product' : 'products'}
                        </MetaPill>

                        {digitalCount > 0 ? (
                            <MetaPill>
                                <span className="font-mono tabular-nums text-zinc-200">
                                    {digitalCount}
                                </span>
                                digital
                            </MetaPill>
                        ) : null}

                        {physicalCount > 0 ? (
                            <MetaPill>
                                <span className="font-mono tabular-nums text-zinc-200">
                                    {physicalCount}
                                </span>
                                physical
                            </MetaPill>
                        ) : null}

                        <MetaPill>
                            <ShieldCheck
                                className="h-3.5 w-3.5 text-zinc-500"
                                strokeWidth={1.75}
                            />
                            Secure checkout
                        </MetaPill>
                    </div>
                </section>

                <section className="py-14">
                    <CategoryChips
                        categories={categories}
                        activeSlug={activeCategory?.slug ?? null}
                        totalProducts={allProducts.length}
                        basePath="/"
                    />

                    {visibleProducts.length === 0 ? (
                        <EmptyCatalog storeName={store.name} />
                    ) : (
                        <>
                            <div className="mb-8 flex items-baseline justify-between gap-4">
                                <h2 className="text-sm font-medium tracking-tight text-zinc-300">
                                    {activeCategory
                                        ? `In ${activeCategory.name}`
                                        : 'Everything in the shop'}
                                </h2>
                                <span className="font-mono text-[11px] tabular-nums text-zinc-600">
                                    {visibleProducts.length
                                        .toString()
                                        .padStart(2, '0')}{' '}
                                    items
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {visibleProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </section>
            </main>

            <footer className="border-t border-zinc-800/80">
                <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 sm:flex-row sm:items-center">
                    <p className="text-sm text-zinc-500">
                        © {new Date().getFullYear()} {store.name}. All rights
                        reserved.
                    </p>
                    <Link
                        href={PLATFORM_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-zinc-600 transition hover:text-zinc-400"
                    >
                        <Store className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Powered by
                        <span className="font-medium tracking-tight text-zinc-400">
        Vessel Engine
    </span>
                    </Link>
                </div>
            </footer>

            <Toaster
                richColors
                position="top-right"
                theme="dark"
                offset={{ top: 70, right: 470 }}
            />
            <CheckoutCanceledToast />
        </div>
    );
}

function MetaPill({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5 text-[13px] tracking-tight text-zinc-500">
            {children}
        </span>
    );
}