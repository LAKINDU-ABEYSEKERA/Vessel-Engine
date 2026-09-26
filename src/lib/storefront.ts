/**
 * Shared primitives for the multi-tenant storefront.
 *
 * The normalizers below are deliberately permissive so the UI layer stays
 * decoupled from the exact column naming in `@/db/queries/storefront`.
 * If your schema already matches `StoreProduct` / `TenantStore`, the
 * normalizers are a no-op pass-through.
 */

import { ROOT_DOMAIN } from '@/lib/config';                       // ← CHANGED: import from config

export type ProductKind = "digital" | "physical";

export type StoreProduct = {
    id: string;
    name: string;
    description: string | null;
    /** Price in the smallest currency unit (cents). */
    unitAmount: number;
    kind: ProductKind;
    /** `null` means unlimited (digital goods). */
    stock: number | null;
    imageUrl: string | null;
};

export type StoreCategory = {
    id: string;
    name: string;
    slug: string;
    type: string;
    position: number;
};

export type TenantStore = {
    id: string;
    name: string;
    subdomain: string;
    description: string | null;
    customDomain: string | null;
    logoUrl: string | null;
};

/* -------------------------------------------------------------------------- */
/*  Loose shapes accepted from the data layer                                  */
/* -------------------------------------------------------------------------- */

type Numeric = number | string | null | undefined;

export type RawProduct = {
    id: string | number;
    name?: string | null;
    title?: string | null;
    description?: string | null;
    priceInCents?: Numeric;
    price?: Numeric;
    amount?: Numeric;
    type?: string | null;
    productType?: string | null;
    isDigital?: boolean | null;
    stock?: Numeric;
    inventory?: Numeric;
    quantity?: Numeric;
    imageUrl?: string | null;
    image?: string | null;
    thumbnail?: string | null;
};

export type RawStore = {
    id: string | number;
    name?: string | null;
    title?: string | null;
    subdomain?: string | null;
    slug?: string | null;
    description?: string | null;
    tagline?: string | null;
    customDomain?: string | null;
    domain?: string | null;
    logoUrl?: string | null;
    logo?: string | null;
};

export function normalizeCategory(raw: {
    id: string | number;
    name: string;
    slug: string;
    type: string;
    position: number;
}): StoreCategory {
    return {
        id: String(raw.id),
        name: raw.name,
        slug: raw.slug,
        type: raw.type,
        position: raw.position,
    };
}

/* -------------------------------------------------------------------------- */
/*  Normalizers                                                                */
/* -------------------------------------------------------------------------- */

function toNumber(value: Numeric): number | null {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeStore(raw: RawStore, fallbackSubdomain: string): TenantStore {
    return {
        id: String(raw.id),
        name: raw.name ?? raw.title ?? fallbackSubdomain,
        subdomain: raw.subdomain ?? raw.slug ?? fallbackSubdomain,
        description: raw.description ?? raw.tagline ?? null,
        customDomain: raw.customDomain ?? raw.domain ?? null,
        logoUrl: raw.logoUrl ?? raw.logo ?? null,
    };
}

export function normalizeProduct(raw: RawProduct): StoreProduct {
    const cents = toNumber(raw.priceInCents);
    const major = toNumber(raw.price) ?? toNumber(raw.amount);
    const unitAmount = cents ?? (major !== null ? Math.round(major * 100) : 0);

    const declaredType = (raw.type ?? raw.productType ?? "").toLowerCase();
    const kind: ProductKind =
        declaredType === "digital" || raw.isDigital === true ? "digital" : "physical";

    const stockValue = toNumber(raw.stock) ?? toNumber(raw.inventory) ?? toNumber(raw.quantity);

    return {
        id: String(raw.id),
        name: raw.name ?? raw.title ?? "Untitled product",
        description: raw.description ?? null,
        unitAmount,
        kind,
        // Digital goods never deplete.
        stock: kind === "digital" ? null : stockValue,
        imageUrl: raw.imageUrl ?? raw.image ?? raw.thumbnail ?? null,
    };
}

/* -------------------------------------------------------------------------- */
/*  Stock semantics                                                            */
/* -------------------------------------------------------------------------- */

export const LOW_STOCK_THRESHOLD = 5;

export type StockState =
    | { status: "unlimited" }
    | { status: "in-stock"; remaining: number | null }
    | { status: "low"; remaining: number }
    | { status: "sold-out" };

export function getStockState(product: StoreProduct): StockState {
    if (product.kind === "digital" || product.stock === null) return { status: "unlimited" };
    if (product.stock <= 0) return { status: "sold-out" };
    if (product.stock < LOW_STOCK_THRESHOLD) return { status: "low", remaining: product.stock };
    return { status: "in-stock", remaining: product.stock };
}

export function isPurchasable(product: StoreProduct): boolean {
    return getStockState(product).status !== "sold-out";
}

/* -------------------------------------------------------------------------- */
/*  Formatting + class helpers                                                 */
/* -------------------------------------------------------------------------- */

const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Formats a cents value as USD, e.g. `2400` -> `$24.00`. */
export function formatUSD(cents: number): string {
    return usd.format((cents ?? 0) / 100);
}

/** Minimal class joiner — no dependency on `clsx`/`tailwind-merge`. */
export function cx(...values: Array<string | false | null | undefined>): string {
    return values.filter(Boolean).join(" ");
}

// ----------------------------------------------------------------------------
// Root domain — single source of truth lives in `@/lib/config`.
// Re-exported here so existing imports from `@/lib/storefront` keep working.
// ----------------------------------------------------------------------------
export { ROOT_DOMAIN } from '@/lib/config';                       // ← CHANGED: re-export

export function storeUrl(store: TenantStore): string {
    // In local development, route to localhost:3000 instead of the real internet
    if (process.env.NODE_ENV === "development") {
        return store.customDomain
            ? `http://${store.customDomain}`
            : `http://${store.subdomain}.localhost:3000`;
    }

    return store.customDomain
        ? `https://${store.customDomain}`
        : `https://${store.subdomain}.${ROOT_DOMAIN}`;
}

export function storeHostname(store: TenantStore): string {
    return store.customDomain ?? `${store.subdomain}.${ROOT_DOMAIN}`;
}

