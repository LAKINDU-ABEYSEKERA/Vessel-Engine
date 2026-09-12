'use client';

import { useState } from 'react';
import { useCartStore, type AddItemInput } from '@/stores/useCartStore';

interface AddToCartButtonProps {
  product: AddItemInput & { inventory?: number };
  storeId: string;
}

export function AddToCartButton({ product, storeId }: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);

  const inStock =
    product.isDigital ||
    product.inventory === undefined ||
    product.inventory > 0;

  const handleClick = () => {
    if (!inStock) return;
    addItem(product, storeId);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!inStock}
      aria-live="polite"
      className={
        'w-full rounded-lg px-4 py-2 text-sm font-medium transition ' +
        (!inStock
          ? 'cursor-not-allowed bg-gray-200 text-gray-500'
          : justAdded
            ? 'bg-emerald-600 text-white'
            : 'bg-gray-900 text-white hover:bg-gray-800')
      }
    >
      {!inStock ? 'Out of stock' : justAdded ? 'Added ✓' : 'Add to cart'}
    </button>
  );
}