import { and, count, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import {
    ArrowUpRight,
    Boxes,
    Download,
    Layers,
    Package,
    type LucideIcon,
} from "lucide-react";
import { notFound } from 'next/navigation';
import { auth } from "@/auth";
import { db } from "@/db";
import { categories, products, stores } from "@/db/schema";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatCurrency(cents: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(cents / 100);
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    }).format(date);
}

/* -------------------------------------------------------------------------- */
/*  Metric card                                                                */
/* -------------------------------------------------------------------------- */

type Accent = "emerald" | "indigo" | "amber";

interface MetricCardProps {
    label: string;
    value: string;
    icon: LucideIcon;
    subLabel?: string;
    accent?: Accent;
}

function MetricCard({
                        label,
                        value,
                        icon: Icon,
                        subLabel,
                        accent,
                    }: MetricCardProps) {
    const accentClasses =
        accent === "emerald"
            ? "bg-emerald-500/10 text-emerald-400"
            : accent === "indigo"
                ? "bg-indigo-500/10 text-indigo-400"
                : accent === "amber"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-zinc-800 text-zinc-400";

    return (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {label}
                </span>
                <span
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        accentClasses
                    )}
                >
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            <p className="text-3xl font-semibold text-zinc-900 dark:text-white tabular-nums">
                {value}
            </p>
            {subLabel ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                    {subLabel}
                </p>
            ) : null}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function StoreOverviewPage({
                                                    params,
                                                }: {
    params: Promise<{ subdomain: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) notFound();
    const userId = session.user.id;
    const { subdomain } = await params;

    const [store] = await db
        .select()
        .from(stores)
        .where(
            and(
                eq(stores.subdomain, subdomain),
                eq(stores.userId, userId),
                isNull(stores.deletedAt)
            )
        )
        .limit(1);

    if (!store) notFound();

    // ------------------------------------------------------------------
    // Aggregate counts — issued in parallel.
    // ------------------------------------------------------------------
    const [productCountRow, digitalCountRow, sectionCountRow] = await Promise.all([
        db
            .select({ value: count() })
            .from(products)
            .where(eq(products.storeId, store.id)),
        db
            .select({ value: count() })
            .from(products)
            .where(
                and(eq(products.storeId, store.id), eq(products.isDigital, true))
            ),
        db
            .select({ value: count() })
            .from(categories)
            .where(eq(categories.storeId, store.id)),
    ]);

    const totalProducts = Number(productCountRow[0]?.value ?? 0);
    const digitalCount = Number(digitalCountRow[0]?.value ?? 0);
    const physicalCount = totalProducts - digitalCount;
    const sectionCount = Number(sectionCountRow[0]?.value ?? 0);

    // ------------------------------------------------------------------
    // Recent products (5 newest)
    // ------------------------------------------------------------------
    const recentProducts = await db
        .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            priceInCents: products.priceInCents,
            isDigital: products.isDigital,
            imageUrl: products.imageUrl,
            createdAt: products.createdAt,
        })
        .from(products)
        .where(eq(products.storeId, store.id))
        .orderBy(desc(products.createdAt))
        .limit(5);

    return (
        <div className="p-8">
            <header className="mb-8">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Store overview
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    A snapshot of what&apos;s happening on this storefront.
                </p>
            </header>

            {/* -------------------------------------------------------- */}
            {/* Stats grid                                                */}
            {/* -------------------------------------------------------- */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <MetricCard
                    label="Total products"
                    value={totalProducts.toString()}
                    icon={Boxes}
                    subLabel={`${digitalCount} digital · ${physicalCount} physical`}
                    accent="indigo"
                />
                <MetricCard
                    label="Digital products"
                    value={digitalCount.toString()}
                    icon={Download}
                    subLabel="Instant delivery"
                />
                <MetricCard
                    label="Physical products"
                    value={physicalCount.toString()}
                    icon={Package}
                    subLabel="Ship-based fulfillment"
                    accent="emerald"
                />
                <MetricCard
                    label="Sections"
                    value={sectionCount.toString()}
                    icon={Layers}
                    subLabel="Product groupings"
                    accent="amber"
                />
            </div>

            {/* -------------------------------------------------------- */}
            {/* Recent products                                           */}
            {/* -------------------------------------------------------- */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                            Recent products
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            The 5 most recently added items.
                        </p>
                    </div>
                    <Link
                        href={`/app/stores/${subdomain}/products`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        View all
                        <ArrowUpRight className="h-3 w-3" />
                    </Link>
                </div>

                {recentProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
                            <Package className="h-6 w-6 text-zinc-400" />
                        </div>
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                            No products yet
                        </h4>
                        <p className="text-sm text-zinc-500 mt-1 mb-4">
                            Add your first product to get started.
                        </p>
                        <Link
                            href={`/app/stores/${subdomain}/products/new`}
                            className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                            Add product
                        </Link>
                    </div>
                ) : (
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {recentProducts.map((product) => (
                            <li
                                key={product.id}
                                className="flex items-center gap-4 px-6 py-4"
                            >
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
                                    {product.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={product.imageUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : product.isDigital ? (
                                        <Download className="h-4 w-4 text-indigo-400" />
                                    ) : (
                                        <Package className="h-4 w-4 text-emerald-400" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                                        {product.name}
                                    </div>
                                    <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                                        {product.slug}
                                    </div>
                                </div>

                                <div className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 hidden sm:block">
                                    {formatDate(product.createdAt)}
                                </div>

                                <div className="font-mono text-sm text-zinc-900 dark:text-white shrink-0 tabular-nums">
                                    {formatCurrency(product.priceInCents)}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}