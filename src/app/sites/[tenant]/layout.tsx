import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/storefront/cart-provider";
import { getTenantStore } from "@/db/queries/storefront";
import { normalizeStore, type RawStore } from "@/lib/storefront";

export const dynamic = "force-dynamic";

export default async function TenantLayout({
                                               children,
                                               params,
                                           }: {
    children: ReactNode;
    params: Promise<{ tenant: string }>;
}) {
    const { tenant } = await params;
    const record = (await getTenantStore(tenant)) as RawStore | null | undefined;
    if (!record) notFound();

    const store = normalizeStore(record, tenant);

    return (
        <CartProvider storeId={store.id} storeName={store.name}>
            {children}
        </CartProvider>
    );
}