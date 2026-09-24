"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    ArrowRight,
    Loader2,
    Minus,
    Plus,
    ShoppingBag,
    Trash2,
    X,
    Package,
    Download
} from "lucide-react";
import { toast } from "sonner";
import { createCheckoutSession } from "@/actions/checkout";
import { useCart } from "@/components/storefront/cart-provider";
import { cx, formatUSD } from "@/lib/storefront";

const CART_KEYFRAMES = `
@keyframes vessel-count-pop {
  0%   { transform: scale(0.6); opacity: 0; }
  55%  { transform: scale(1.18); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes vessel-panel-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
@keyframes vessel-scrim-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.vessel-count-pop { animation: vessel-count-pop 260ms cubic-bezier(0.34, 1.4, 0.64, 1); }
.vessel-panel-in  { animation: vessel-panel-in 240ms cubic-bezier(0.22, 1, 0.36, 1); }
.vessel-scrim-in  { animation: vessel-scrim-in 200ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .vessel-count-pop, .vessel-panel-in, .vessel-scrim-in { animation: none; }
}
`;

export function CartButton() {
    const { itemCount, subtotal, hydrated } = useCart();
    const [open, setOpen] = useState(false);

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: CART_KEYFRAMES }} />

            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={itemCount > 0 ? `Open cart, ${itemCount} items` : "Open cart"}
                className={cx(
                    "group relative inline-flex h-10 items-center gap-2 rounded-full border border-zinc-800/80",
                    "bg-zinc-900/60 pl-4 pr-1.5 text-sm font-medium tracking-tight text-zinc-200",
                    "transition duration-200 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 cursor-pointer",
                )}
            >
                <ShoppingBag className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-zinc-200" strokeWidth={1.75} />
                <span className="hidden sm:inline pr-1">Cart</span>

                {hydrated && itemCount > 0 ? (
                    <div className="flex items-center gap-2 pl-2 border-l border-zinc-700/60">
                        <span className="font-mono text-xs font-semibold text-zinc-300">
                            {formatUSD(subtotal)}
                        </span>
                        <span className="vessel-count-pop inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-zinc-100 px-2 font-mono text-[11px] font-bold leading-none tabular-nums text-zinc-900">
                            {itemCount}
                        </span>
                    </div>
                ) : (
                    <span className="ml-1 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 px-2 font-mono text-[11px] leading-none tabular-nums text-zinc-500">
                        0
                    </span>
                )}
            </button>

            <CartPanel open={open} onClose={() => setOpen(false)} />
        </>
    );
}

function CartPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { lines, itemCount, subtotal, setQuantity, remove, clear, storeName } = useCart();
    const [checkingOut, setCheckingOut] = useState(false);
    const [mounted, setMounted] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        closeRef.current?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    const checkout = useCallback(async () => {
        setCheckingOut(true);
        try {
            const host = window.location.host;
            const tenantSlug = host.split(".")[0];

            const payload = lines.map((line) => ({
                id: line.productId,
                quantity: line.quantity,
            }));

            await createCheckoutSession(payload, tenantSlug);
        } catch (error: unknown) {
            const err = error as { message?: string; digest?: string } | undefined;

            if (
                err?.message === "NEXT_REDIRECT" ||
                (typeof err?.digest === "string" && err.digest.startsWith("NEXT_REDIRECT"))
            ) {
                throw error;
            }

            setCheckingOut(false);
            toast.error("Checkout didn't start", {
                description: "Your cart is saved. Try again in a moment.",
            });
        }
    }, [lines]);

    if (!open || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end" role="dialog" aria-modal="true" aria-label="Cart">
            {/* Backdrop */}
            <div
                className="vessel-scrim-in fixed inset-0 bg-black/75 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Slide-over Drawer Panel */}
            <div
                className={cx(
                    "vessel-panel-in relative z-10 flex h-full h-dvh w-full max-w-md flex-col",
                    "border-l border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/80",
                )}
            >
                {/* Drawer Header */}
                <header className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <h2 className="text-base font-semibold tracking-tight text-zinc-100">Your cart</h2>
                        <span className="font-mono text-xs tabular-nums text-zinc-400 bg-zinc-900 px-2.5 py-0.5 rounded-full border border-zinc-800">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {itemCount > 0 && (
                            <button
                                type="button"
                                onClick={clear}
                                className="text-xs font-medium text-zinc-500 hover:text-red-400 transition-colors px-2 py-1 cursor-pointer"
                            >
                                Clear all
                            </button>
                        )}
                        <button
                            ref={closeRef}
                            type="button"
                            onClick={onClose}
                            aria-label="Close cart"
                            className="rounded-full border border-transparent p-1.5 text-zinc-400 transition hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 cursor-pointer"
                        >
                            <X className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                    </div>
                </header>

                {/* Drawer Content */}
                {lines.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                        <div className="rounded-full border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-inner">
                            <ShoppingBag className="h-8 w-8 text-zinc-600" strokeWidth={1.5} />
                        </div>
                        <div>
                            <p className="text-base font-medium text-zinc-200">Your cart is empty.</p>
                            <p className="max-w-[24ch] text-sm leading-relaxed text-zinc-500 mt-1">
                                Add something from the {storeName} collection to get started.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="mt-2 rounded-xl bg-zinc-100 px-6 py-2.5 text-sm font-semibold tracking-tight text-zinc-900 transition hover:bg-white cursor-pointer"
                        >
                            Continue Shopping
                        </button>
                    </div>
                ) : (
                    <ul className="flex-1 min-h-0 divide-y divide-zinc-800/60 overflow-y-auto px-1">
                        {lines.map((line) => (
                            <li key={line.productId} className="flex gap-4 px-5 py-4.5">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900 shadow-sm">
                                    {line.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={line.imageUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center font-mono text-sm font-medium text-zinc-600">
                                            {line.name.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1 flex flex-col justify-between">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold tracking-tight text-zinc-100">
                                                {line.name}
                                            </p>
                                            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-tight text-zinc-500 uppercase">
                                                {line.kind === 'digital' ? <Download size={10} className="text-indigo-400" /> : <Package size={10} className="text-emerald-400" />}
                                                {line.kind}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-zinc-100">
                                            {formatUSD(line.unitAmount * line.quantity)}
                                        </p>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="inline-flex items-center rounded-lg border border-zinc-700/80 bg-zinc-900/80 p-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setQuantity(line.productId, line.quantity - 1)}
                                                aria-label={`Decrease quantity of ${line.name}`}
                                                className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 cursor-pointer"
                                            >
                                                <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                                            </button>
                                            <span className="w-8 text-center font-mono text-xs font-semibold tabular-nums text-zinc-200">
                                                {line.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setQuantity(line.productId, line.quantity + 1)}
                                                disabled={
                                                    line.maxQuantity !== null && line.quantity >= line.maxQuantity
                                                }
                                                aria-label={`Increase quantity of ${line.name}`}
                                                className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 cursor-pointer"
                                            >
                                                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => remove(line.productId)}
                                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 cursor-pointer"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Drawer Footer */}
                <footer className="shrink-0 border-t border-zinc-800/80 bg-zinc-950 px-6 py-5">
                    <div className="flex items-baseline justify-between mb-4">
                        <span className="text-sm font-medium text-zinc-400">Estimated Total</span>
                        <span className="font-mono text-xl font-bold tabular-nums tracking-tight text-white">
                            {formatUSD(subtotal)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={checkout}
                        disabled={lines.length === 0 || checkingOut}
                        className={cx(
                            "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl",
                            "bg-zinc-100 text-sm font-bold tracking-tight text-zinc-900",
                            "transition duration-200 hover:bg-white hover:shadow-lg hover:shadow-zinc-100/10",
                            "disabled:pointer-events-none disabled:bg-zinc-800 disabled:text-zinc-500",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 cursor-pointer",
                        )}
                    >
                        {checkingOut ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                                Preparing secure checkout...
                            </>
                        ) : (
                            <>
                                Checkout securely
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                            </>
                        )}
                    </button>
                    <p className="mt-3 text-center text-[11px] font-medium text-zinc-500">
                        Taxes & shipping calculated at next step.
                    </p>
                </footer>
            </div>
        </div>,
        document.body
    );
}