import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantStore, getStoreProducts } from '@/db/queries/storefront';
import { CartButton } from '@/components/cart/CartButton';
import { AddToCartButton } from '@/components/cart/AddToCartButton';

export const dynamic = 'force-dynamic';

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default async function TenantStorefrontPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const store = await getTenantStore(tenant);

  if (!store) {
    notFound();
  }

  const storeProducts = await getStoreProducts(store.id);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      {/* Store Header with Cart Trigger */}
      <header className="mb-12 flex items-start justify-between border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            {store.name}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {store.subdomain}.vesselengine.com
          </p>
        </div>
        <CartButton storeId={store.id} />
      </header>

      {/* Product Grid */}
      {storeProducts.length === 0 ? (
        <p className="text-gray-500">No products available yet.</p>
      ) : (
        <section
          aria-label="Products"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {storeProducts.map((product) => (
            <article
              key={product.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {product.name}
                </h2>
                <span
                  className={
                    'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                    (product.isDigital
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-emerald-50 text-emerald-700')
                  }
                >
                  {product.isDigital ? 'Digital' : 'Physical'}
                </span>
              </div>

              {product.description && (
                <p className="mb-4 line-clamp-3 text-sm text-gray-600">
                  {product.description}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(product.priceInCents)}
                </span>
                {!product.isDigital && (
                  <span className="text-xs text-gray-500">
                    {product.inventory > 0
                      ? `${product.inventory} in stock`
                      : 'Out of stock'}
                  </span>
                )}
              </div>

              <div className="mt-4">
                <AddToCartButton
                  storeId={store.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    priceInCents: product.priceInCents,
                    isDigital: product.isDigital,
                    inventory: product.inventory,
                  }}
                />
              </div>
            </article>
          ))}
        </section>
      )}

      <footer className="mt-16 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
        Powered by{' '}
        <Link href="/" className="underline hover:text-gray-600">
          Vessel Engine
        </Link>
      </footer>
    </main>
  );
}