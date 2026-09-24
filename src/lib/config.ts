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