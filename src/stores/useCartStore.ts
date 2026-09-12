import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  storeId: string;
  name: string;
  priceInCents: number;
  quantity: number;
  isDigital: boolean;
  inventory?: number;
}

export interface AddItemInput {
  id: string;
  name: string;
  priceInCents: number;
  isDigital: boolean;
  inventory?: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: AddItemInput, storeId: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: (storeId: string) => void;
  getStoreItems: (storeId: string) => CartItem[];
  getStoreTotal: (storeId: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, storeId) => {
        set((state) => {
          const existing = state.items.find(
            (item) => item.id === product.id && item.storeId === storeId
          );

          if (existing) {
            if (
              !product.isDigital &&
              product.inventory !== undefined &&
              existing.quantity >= product.inventory
            ) {
              return state;
            }

            return {
              items: state.items.map((item) =>
                item.id === product.id && item.storeId === storeId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }

          const newItem: CartItem = {
            id: product.id,
            storeId,
            name: product.name,
            priceInCents: product.priceInCents,
            isDigital: product.isDigital,
            inventory: product.inventory,
            quantity: 1,
          };

          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.id !== productId),
            };
          }

          return {
            items: state.items.map((item) => {
              if (item.id !== productId) return item;

              const max =
                !item.isDigital && item.inventory !== undefined
                  ? item.inventory
                  : Infinity;

              return {
                ...item,
                quantity: Math.min(quantity, max),
              };
            }),
          };
        });
      },

      clearCart: (storeId) => {
        set((state) => ({
          items: state.items.filter((item) => item.storeId !== storeId),
        }));
      },

      getStoreItems: (storeId) => {
        return get().items.filter((item) => item.storeId === storeId);
      },

      getStoreTotal: (storeId) => {
        return get()
          .items.filter((item) => item.storeId === storeId)
          .reduce(
            (sum, item) => sum + item.priceInCents * item.quantity,
            0
          );
      },
    }),
    {
      name: 'vessel-cart',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);