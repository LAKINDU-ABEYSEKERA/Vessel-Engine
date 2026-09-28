'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import type { ProductKind } from '@/lib/storefront';

export type CartLine = {
    productId: string;
    name: string;
    /** Price in cents. */
    unitAmount: number;
    quantity: number;
    /** `null` = unlimited (digital goods). */
    maxQuantity: number | null;
    kind: ProductKind;
    imageUrl: string | null;
};

export type AddResult = { ok: boolean; reason?: 'sold-out' | 'stock-limit' };

type CartContextValue = {
    storeId: string;
    storeName: string;
    lines: CartLine[];
    /** False during the first paint, before localStorage has been read. */
    hydrated: boolean;
    itemCount: number;
    subtotal: number;
    quantityOf: (productId: string) => number;
    add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => AddResult;
    setQuantity: (productId: string, quantity: number) => void;
    remove: (productId: string) => void;
    clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(storeId: string) {
    return `vessel:cart:${storeId}`;
}

function parseLines(value: string | null): CartLine[] {
    if (!value) return [];
    try {
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (line): line is CartLine =>
                !!line &&
                typeof line === 'object' &&
                typeof (line as CartLine).productId === 'string' &&
                typeof (line as CartLine).quantity === 'number'
        );
    } catch {
        return [];
    }
}

export function CartProvider({
                                 storeId,
                                 storeName,
                                 children,
                             }: {
    storeId: string;
    storeName: string;
    children: ReactNode;
}) {
    const [lines, setLines] = useState<CartLine[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const key = storageKey(storeId);

    // ------------------------------------------------------------------
    // Initial read from localStorage.
    //
    // This runs once on mount (and again only if the tenant changes).
    // The `hydrated` flag ensures the first client render matches the
    // server-rendered HTML; the cart contents only appear on the second
    // render pass.
    //
    // The lint rule below is disabled because localStorage is a genuine
    // external system that must be read post-hydration. The recommended
    // alternative — `useSyncExternalStore` for the entire cart — would
    // require making localStorage the single source of truth and
    // rewriting every mutation site. Not worth the churn for one read.
    // ------------------------------------------------------------------
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reading external localStorage on mount
        setLines(parseLines(window.localStorage.getItem(key)));
        setHydrated(true);
    }, [key]);

    // Persist after hydration only, so we never clobber saved state with [].
    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(key, JSON.stringify(lines));
        } catch {
            // Storage full or blocked (private mode) — cart stays in memory.
        }
    }, [hydrated, key, lines]);

    // Keep duplicate tabs of the same store in sync. Including `key` in
    // the dependency array means the listener always has the current key
    // in scope — no ref needed.
    useEffect(() => {
        function onStorage(event: StorageEvent) {
            if (event.key !== key) return;
            setLines(parseLines(event.newValue));
        }
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [key]);

    const quantityOf = useCallback(
        (productId: string) =>
            lines.find((line) => line.productId === productId)?.quantity ?? 0,
        [lines]
    );

    const add = useCallback<CartContextValue['add']>(
        (line, quantity = 1) => {
            const max = line.maxQuantity;

            // Sold out — reject before touching state.
            if (max !== null && max <= 0) {
                return { ok: false, reason: 'sold-out' };
            }

            // Compute the returned result against the render-time snapshot
            // so the caller sees the outcome of *this* render, not a mutated
            // closure that may run during the next commit.
            const existing = lines.find(
                (item) => item.productId === line.productId
            );
            const nextQuantity = (existing?.quantity ?? 0) + quantity;
            const capped =
                max === null ? nextQuantity : Math.min(nextQuantity, max);

            if (existing && capped === existing.quantity) {
                return { ok: false, reason: 'stock-limit' };
            }

            setLines((current) => {
                // Re-cap against the freshest state so batched dispatches
                // can't push a line past its stock ceiling.
                const currentExisting = current.find(
                    (item) => item.productId === line.productId
                );
                const currentNext =
                    (currentExisting?.quantity ?? 0) + quantity;
                const currentCapped =
                    max === null ? currentNext : Math.min(currentNext, max);

                if (!currentExisting) {
                    return [
                        ...current,
                        { ...line, quantity: currentCapped },
                    ];
                }

                return current.map((item) =>
                    item.productId === line.productId
                        ? { ...item, ...line, quantity: currentCapped }
                        : item
                );
            });

            return { ok: true };
        },
        [lines]
    );

    const setQuantity = useCallback<CartContextValue['setQuantity']>(
        (productId, quantity) => {
            setLines((current) => {
                if (quantity <= 0)
                    return current.filter((line) => line.productId !== productId);
                return current.map((line) => {
                    if (line.productId !== productId) return line;
                    const capped =
                        line.maxQuantity === null
                            ? quantity
                            : Math.min(quantity, line.maxQuantity);
                    return { ...line, quantity: capped };
                });
            });
        },
        []
    );

    const remove = useCallback<CartContextValue['remove']>((productId) => {
        setLines((current) => current.filter((line) => line.productId !== productId));
    }, []);

    const clear = useCallback(() => setLines([]), []);

    const value = useMemo<CartContextValue>(() => {
        const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
        const subtotal = lines.reduce(
            (total, line) => total + line.unitAmount * line.quantity,
            0
        );
        return {
            storeId,
            storeName,
            lines,
            hydrated,
            itemCount,
            subtotal,
            quantityOf,
            add,
            setQuantity,
            remove,
            clear,
        };
    }, [
        add,
        clear,
        hydrated,
        lines,
        quantityOf,
        remove,
        setQuantity,
        storeId,
        storeName,
    ]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used inside <CartProvider>.');
    }
    return context;
}