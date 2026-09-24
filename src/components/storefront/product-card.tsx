import { Download, Package } from "lucide-react";

import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import {
    cx,
    formatUSD,
    getStockState,
    type StoreProduct,
} from "@/lib/storefront";

/* -------------------------------------------------------------------------- */
/*  Status dot                                                                 */
/* -------------------------------------------------------------------------- */

function GlowDot({ className }: { className: string }) {
    return (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
      <span className={cx("absolute inline-flex h-full w-full rounded-full opacity-70", className)} />
      <span className={cx("relative inline-flex h-1.5 w-1.5 rounded-full", className)} />
    </span>
    );
}

/* -------------------------------------------------------------------------- */
/*  Type badge                                                                 */
/* -------------------------------------------------------------------------- */

export function ProductTypeBadge({ kind }: { kind: StoreProduct["kind"] }) {
    const digital = kind === "digital";
    const Icon = digital ? Download : Package;

    return (
        <span
            className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                "text-[11px] font-medium tracking-tight backdrop-blur-md",
                digital
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            )}
        >
      <GlowDot className={digital ? "bg-indigo-400" : "bg-emerald-400"} />
      <Icon className="h-3 w-3" strokeWidth={2} />
            {digital ? "Digital" : "Physical"}
    </span>
    );
}

/* -------------------------------------------------------------------------- */
/*  Stock pill                                                                 */
/* -------------------------------------------------------------------------- */

export function StockPill({ product }: { product: StoreProduct }) {
    const state = getStockState(product);

    const config = {
        "sold-out": {
            label: "Sold out",
            className: "border-red-500/20 bg-red-500/5 text-zinc-500",
            dot: "bg-red-500/70",
        },
        low: {
            label: `Low stock: ${state.status === "low" ? state.remaining : 0} remaining`,
            className: "border-amber-500/20 bg-amber-500/10 text-amber-400",
            dot: "bg-amber-400",
        },
        "in-stock": {
            label: "In stock",
            className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
            dot: "bg-emerald-400",
        },
        unlimited: {
            label: "Instant delivery",
            className: "border-zinc-800/80 bg-zinc-900/60 text-zinc-400",
            dot: "bg-zinc-500",
        },
    }[state.status];

    return (
        <span
            className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                "font-mono text-[11px] tabular-nums tracking-tight",
                config.className,
            )}
        >
      <GlowDot className={config.dot} />
            {config.label}
    </span>
    );
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                       */
/* -------------------------------------------------------------------------- */

export function ProductCard({ product }: { product: StoreProduct }) {
    const soldOut = getStockState(product).status === "sold-out";

    return (
        <article
            className={cx(
                "group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900",
                "transition duration-300 hover:border-zinc-700 hover:ring-1 hover:ring-zinc-700/60",
            )}
        >
            <div className="relative aspect-[4/3] overflow-hidden border-b border-zinc-800/80 bg-zinc-950">
                {product.imageUrl ? (
                    // Plain <img> keeps this drop-in — no next.config image domains required.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className={cx(
                            "h-full w-full object-cover transition duration-500 motion-reduce:transition-none",
                            "group-hover:scale-[1.02]",
                            soldOut && "opacity-40 grayscale",
                        )}
                    />
                ) : (
                    <div
                        className="flex h-full w-full items-center justify-center"
                        style={{
                            backgroundImage:
                                "linear-gradient(to right, rgb(39 39 42 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgb(39 39 42 / 0.5) 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }}
                        aria-hidden="true"
                    >
            <span className="font-mono text-2xl tracking-tight text-zinc-800">
              {product.name.slice(0, 2).toUpperCase()}
            </span>
                    </div>
                )}

                <div className="absolute left-3 top-3">
                    <ProductTypeBadge kind={product.kind} />
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="text-[15px] font-medium leading-snug tracking-tight text-zinc-100">
                        {product.name}
                    </h3>
                    <p className="shrink-0 font-mono text-[15px] tabular-nums tracking-tight text-zinc-100">
                        {formatUSD(product.unitAmount)}
                    </p>
                </div>

                {product.description ? (
                    <p className="line-clamp-2 max-w-[48ch] text-sm leading-relaxed text-zinc-500">
                        {product.description}
                    </p>
                ) : null}

                <div className="mt-auto flex flex-col gap-3 pt-1">
                    <StockPill product={product} />
                    <AddToCartButton product={product} />
                </div>
            </div>
        </article>
    );
}
