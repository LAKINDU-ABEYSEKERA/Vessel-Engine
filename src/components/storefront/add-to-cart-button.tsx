"use client";

import { useEffect, useRef, useState } from "react";
import { Check, PackageX, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/components/storefront/cart-provider";
import { cx, formatUSD, type StoreProduct } from "@/lib/storefront";

export function AddToCartButton({ product }: { product: StoreProduct }) {
    const { add, quantityOf, hydrated } = useCart();
    const [justAdded, setJustAdded] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const maxQuantity = product.kind === "digital" ? null : product.stock;
    const soldOut = maxQuantity !== null && maxQuantity <= 0;
    const inCart = quantityOf(product.id);
    const atLimit = !soldOut && maxQuantity !== null && inCart >= maxQuantity;
    // Only disable if the product is truly sold out or at stock limit
    const disabled = soldOut || atLimit;

    function handleAdd() {
        if (!hydrated) return;

        const result = add(
            {
                productId: product.id,
                name: product.name,
                unitAmount: product.unitAmount,
                maxQuantity,
                kind: product.kind,
                imageUrl: product.imageUrl,
            },
            1,
        );

        if (!result.ok) {
            toast.error(
                result.reason === "sold-out" ? "Sold out" : "That's all we have in stock",
                {
                    description:
                        result.reason === "sold-out"
                            ? `${product.name} is no longer available.`
                            : `Only ${maxQuantity} of ${product.name} available.`,
                },
            );
            return;
        }

        setJustAdded(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setJustAdded(false), 1400);

        toast.success("Added to cart", {
            description: `${product.name} · ${formatUSD(product.unitAmount)}`,
        });
    }

    const label = soldOut
        ? "Sold out"
        : atLimit
            ? "Max in cart"
            : justAdded
                ? "Added"
                : inCart > 0
                    ? "Add another"
                    : "Add to cart";

    const Icon = soldOut ? PackageX : justAdded ? Check : inCart > 0 ? Plus : ShoppingBag;

    return (
        <button
            type="button"
            onClick={handleAdd}
            disabled={disabled}
            suppressHydrationWarning
            aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to cart`}
            className={cx(
                "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium tracking-tight",
                "transition duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                soldOut || atLimit
                    ? "cursor-not-allowed border-zinc-800/80 bg-zinc-900/40 text-zinc-600"
                    : justAdded
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-100 text-zinc-900 hover:bg-white hover:border-zinc-200",
            )}
        >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
            {inCart > 0 && !soldOut ? (
                <span className="font-mono text-[11px] tabular-nums text-zinc-500">×{inCart}</span>
            ) : null}
        </button>
    );
}