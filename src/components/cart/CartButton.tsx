'use client';

import { useState } from 'react';
import { useCartStore } from '@/stores/useCartStore';
import { CartDrawer } from './CartDrawer';

export function CartButton({ storeId }: { storeId: string }) {
  const [open, setOpen] = useState(false);
  const allItems = useCartStore((s) => s.items);
  const count = allItems
    .filter((item) => item.storeId === storeId)
    .reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        Cart
        {count > 0 && (
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1.5 text-xs font-semibold text-white dark:bg-white dark:text-black">
            {count}
          </span>
        )}
      </button>
      <CartDrawer
        storeId={storeId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default CartButton;