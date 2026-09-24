"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import type { ProductKind } from "@/lib/storefront";

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

export type AddResult = { ok: boolean; reason?: "sold-out" | "stock-limit" };

type CartContextValue = {
    storeId: string;
    storeName: string;
    lines: CartLine[];
    /** False during the first paint, before localStorage has been read. */
    hydrated: boolean;
    itemCount: number;
    subtotal: number;
    quantityOf: (productId: string) => number;
    add: (line: Omit<CartLine, "quantity">, quantity?: number) => AddResult;
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
                typeof line === "object" &&
                typeof (line as CartLine).productId === "string" &&
                typeof (line as CartLine).quantity === "number",
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
    const keyRef = useRef(key);
    keyRef.current = key;

    // Read once on mount — keeps SSR markup and first client paint identical.
    useEffect(() => {
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

    // Keep duplicate tabs of the same store in sync.
    useEffect(() => {
        function onStorage(event: StorageEvent) {
            if (event.key !== keyRef.current) return;
            setLines(parseLines(event.newValue));
        }
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const quantityOf = useCallback(
        (productId: string) => lines.find((line) => line.productId === productId)?.quantity ?? 0,
        [lines],
    );

    const add = useCallback<CartContextValue["add"]>((line, quantity = 1) => {
        let result: AddResult = { ok: true };

        setLines((current) => {
            const max = line.maxQuantity;
            if (max !== null && max <= 0) {
                result = { ok: false, reason: "sold-out" };
                return current;
            }

            const existing = current.find((item) => item.productId === line.productId);
            const nextQuantity = (existing?.quantity ?? 0) + quantity;
            const capped = max === null ? nextQuantity : Math.min(nextQuantity, max);

            if (existing && capped === existing.quantity) {
                result = { ok: false, reason: "stock-limit" };
                return current;
            }

            result = { ok: true };

            if (!existing) {
                return [...current, { ...line, quantity: capped }];
            }

            return current.map((item) =>
                item.productId === line.productId
                    ? { ...item, ...line, quantity: capped }
                    : item,
            );
        });

        return result;
    }, []);

    const setQuantity = useCallback<CartContextValue["setQuantity"]>((productId, quantity) => {
        setLines((current) => {
            if (quantity <= 0) return current.filter((line) => line.productId !== productId);
            return current.map((line) => {
                if (line.productId !== productId) return line;
                const capped =
                    line.maxQuantity === null ? quantity : Math.min(quantity, line.maxQuantity);
                return { ...line, quantity: capped };
            });
        });
    }, []);

    const remove = useCallback<CartContextValue["remove"]>((productId) => {
        setLines((current) => current.filter((line) => line.productId !== productId));
    }, []);

    const clear = useCallback(() => setLines([]), []);

    const value = useMemo<CartContextValue>(() => {
        const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
        const subtotal = lines.reduce((total, line) => total + line.unitAmount * line.quantity, 0);
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
    }, [add, clear, hydrated, lines, quantityOf, remove, setQuantity, storeId, storeName]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used inside <CartProvider>.");
    }
    return context;
}
