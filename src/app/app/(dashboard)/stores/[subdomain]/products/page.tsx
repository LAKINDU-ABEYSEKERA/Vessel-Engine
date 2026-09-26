import { and, desc, eq, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { Download, Package, Pencil, Plus } from 'lucide-react';

import { auth } from '@/auth';
import { db } from '@/db';
import { stores, products } from '@/db/schema';

import { DeleteProductButton } from './delete-product-button';

function formatMoney(cents: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(cents / 100);
}

export default async function StoreProductsPage({
                                                    params,
                                                }: {
    params: Promise<{ subdomain: string }>;
}) {
    const { subdomain } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const [store] = await db
        .select()
        .from(stores)
        .where(
            and(eq(stores.subdomain, subdomain), isNull(stores.deletedAt))
        )
        .limit(1);

    if (!store || store.userId !== userId) {
        return null;
    }
    if (!store || store.userId !== userId) {
        // Layout already guards ownership; return null as a safe fallback.
        return null;
    }

    const inventory = await db
        .select()
        .from(products)
        .where(eq(products.storeId, store.id))
        .orderBy(desc(products.createdAt));

    return (
        <div className="p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                        Products
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Manage your physical and digital inventory.
                    </p>
                </div>
                <Link
                    href={`/app/stores/${subdomain}/products/new`}
                    className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                    <Plus size={16} />
                    Add product
                </Link>
            </header>

            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                {inventory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
                            <Package className="h-6 w-6 text-zinc-400" />
                        </div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
                            No products yet
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1 mb-4">
                            Create your first product to start selling.
                        </p>
                        <Link
                            href={`/app/stores/${subdomain}/products/new`}
                            className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                            <Plus size={16} />
                            Add product
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                    Product
                                </th>
                                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                    Type
                                </th>
                                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                    Inventory
                                </th>
                                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                    Price
                                </th>
                                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-right">
                                    Actions
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {inventory.map((product) => (
                                <tr
                                    key={product.id}
                                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                                                {product.imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={product.imageUrl}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : product.isDigital ? (
                                                    <Download className="h-4 w-4 text-indigo-400" />
                                                ) : (
                                                    <Package className="h-4 w-4 text-emerald-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-zinc-900 dark:text-white truncate max-w-[240px]">
                                                    {product.name}
                                                </div>
                                                <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate max-w-[240px]">
                                                    {product.slug}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                        {product.isDigital ? 'Digital' : 'Physical'}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                        {product.isDigital
                                            ? '∞ Instant'
                                            : `${product.inventory} in stock`}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-zinc-900 dark:text-white">
                                        {formatMoney(product.priceInCents)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link
                                                href={`/app/stores/${subdomain}/products/${product.id}/edit`}
                                                aria-label={`Edit ${product.name}`}
                                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Edit
                                            </Link>
                                            <DeleteProductButton
                                                subdomain={subdomain}
                                                productId={product.id}
                                                productName={product.name}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}