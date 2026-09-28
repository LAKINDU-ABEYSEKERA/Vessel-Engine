/**
 * Single source of truth for hostname/domain config across the app.
 *
 * `NEXT_PUBLIC_ROOT_DOMAIN` must be public because `src/lib/storefront.ts`
 * runs on both the server and the client (the storefront header badge
 * renders it in a Client Component).
 */
export const ROOT_DOMAIN =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'vesselengine.com';

/**
 * Base domain used by the proxy/middleware for subdomain resolution.
 * In production this equals ROOT_DOMAIN. Kept as a separate export so a
 * future setup (e.g. a staging apex under a different TLD) can override
 * via a non-public, server-only env var.
 */
export const BASE_DOMAIN =
    process.env.BASE_DOMAIN ?? ROOT_DOMAIN;

const isDev = process.env.NODE_ENV === 'development';

/**
 * Public marketing site (apex domain). Used by storefront footer links
 * so customers can discover the platform from any tenant.
 */
export const PLATFORM_URL = isDev
    ? 'http://localhost:3000'
    : `https://${ROOT_DOMAIN}`;

/**
 * Creator dashboard. In dev this is a path on localhost; in production
 * the `app` reserved subdomain resolves to the same route via the proxy.
 */
export const DASHBOARD_URL = isDev
    ? 'http://localhost:3000/app'
    : `https://app.${ROOT_DOMAIN}`;

/**
 * Builds the public storefront URL for a given tenant subdomain.
 * In dev: `http://{sub}.localhost:3000`. In production: `https://{sub}.{ROOT_DOMAIN}`.
 */
export function tenantUrl(subdomain: string): string {
    return isDev
        ? `http://${subdomain}.localhost:3000`
        : `https://${subdomain}.${ROOT_DOMAIN}`;
}