import { auth } from "@/auth";
import { db } from "@/db";
import { stores, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Package, Plus, MoreVertical, Download } from "lucide-react";

// Helper to format currency
function formatMoney(cents: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(cents / 100);
}

export default async function ProductsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/app/login");

    // 1. Fetch the user's store
    const userStores = await db
        .select()
        .from(stores)
        .where(eq(stores.userId, session.user.id));

    const store = userStores[0];

    // If they somehow reach this page without a store, send them back to the overview
    if (!store) {
        redirect("/app");
    }

    // 2. Fetch the products for this store
    const inventory = await db
        .select()
        .from(products)
        .where(eq(products.storeId, store.id))
        .orderBy(desc(products.createdAt));

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                        Products
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Manage your physical and digital inventory.
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer">
                    <Plus size={16} />
                    Add Product
                </button>
            </header>

            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                {inventory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
                            <Package className="h-6 w-6 text-zinc-400" />
                        </div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white">No products found</h3>
                        <p className="text-sm text-zinc-500 mt-1">Get started by creating your first product.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Inventory</th>
                                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Price</th>
                                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {inventory.map((product) => (
                                <tr key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                                                {product.isDigital ? (
                                                    <Download className="h-4 w-4 text-indigo-400" />
                                                ) : (
                                                    <Package className="h-4 w-4 text-emerald-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-zinc-900 dark:text-white">{product.name}</div>
                                                <div className="text-xs text-zinc-500 font-mono mt-0.5">{product.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                        {product.isDigital ? "∞ Instant" : `${product.inventory} in stock`}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-zinc-900 dark:text-white">
                                        {formatMoney(product.priceInCents)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                                            <MoreVertical size={16} />
                                        </button>
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