'use client';

import { useEffect } from 'react';
import { useCart } from '@/components/storefront/cart-provider';

/**
 * Clears the tenant-scoped cart once the Stripe success page mounts.
 *
 * Requires an ancestor <CartProvider> — provided by
 * `src/app/sites/[tenant]/layout.tsx`, which wraps both the storefront
 * and the /success route. Because CartProvider is keyed to a single
 * storeId, `clear()` only ever affects the current tenant.
 *
 * The optional `storeId` prop is a defensive check: if the provider's
 * store ID ever diverges from the caller's, we skip instead of clearing
 * the wrong cart.
 */
export function CartClear({ storeId }: { storeId?: string } = {}) {
    const { clear, hydrated, storeId: contextStoreId } = useCart();

    useEffect(() => {
        if (!hydrated) return;
        if (storeId && storeId !== contextStoreId) return;
        clear();
    }, [clear, hydrated, storeId, contextStoreId]);

    return null;
}