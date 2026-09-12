'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '../../stores/useCartStore';

interface CartDrawerProps {
  storeId: string;
  open: boolean;
  onClose: () => void;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function CartDrawer({ storeId, open, onClose }: CartDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const allItems = useCartStore((s) => s.items);
    const items = allItems.filter((item) => item.storeId === storeId);

  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const subtotal = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={
          'fixed inset-0 z-40 bg-black/40 transition-opacity ' +
          (open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none')
        }
      />

      {/* Slide-over Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white text-gray-900 shadow-xl transition-transform duration-300 ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Your cart</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close cart"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="mt-16 text-center text-sm text-gray-500">
              Your cart is empty.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatPrice(item.priceInCents)}
                      {item.isDigital && ' · Digital'}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="h-7 w-7 rounded border border-gray-300 text-sm hover:bg-gray-50"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        disabled={
                          !item.isDigital &&
                          item.inventory !== undefined &&
                          item.quantity >= item.inventory
                        }
                        className="h-7 w-7 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="ml-2 text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <span className="text-sm font-semibold text-gray-900">
                    {formatPrice(item.priceInCents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-gray-200 px-6 py-4">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(subtotal)}
            </span>
          </div>

          <button
            type="button"
            disabled={items.length === 0}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Checkout
          </button>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => clearCart(storeId)}
              className="mt-2 w-full text-center text-xs text-gray-500 hover:text-gray-700"
            >
              Clear cart
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}