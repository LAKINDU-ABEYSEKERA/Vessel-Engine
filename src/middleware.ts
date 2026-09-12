import { NextRequest, NextResponse } from 'next/server';

// Base domain for subdomain-based tenant resolution.
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'vesselengine.com';

// Reserved subdomains that must not be treated as tenant slugs.
const RESERVED_SUBDOMAINS = new Set(['app', 'admin', 'api', 'www']);

// Temporary in-memory map for custom domain -> tenant resolution.
// To be replaced by a database lookup in a later phase.
const CUSTOM_DOMAIN_TENANT_MAP: Record<string, string> = {
    'acme.com': 'acme',
    'www.acme.com': 'acme',
    'globex.com': 'globex',
    'www.globex.com': 'globex',
};

function normalizeHost(hostHeader: string | null): string {
    if (!hostHeader) return '';
    // Lowercase and strip port.
    return hostHeader.split(':')[0].toLowerCase().replace(/\.$/, '');
}

function getBaseDomainForHost(hostname: string): string {
    // If localhost (or subdomain of localhost), use "localhost" as base.
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
        return 'localhost';
    }
    return BASE_DOMAIN;
}

export function middleware(request: NextRequest) {
    const host = request.headers.get('host');
    const hostname = normalizeHost(host);
    const baseDomain = getBaseDomainForHost(hostname);
    const pathname = request.nextUrl.pathname;
    const search = request.nextUrl.search;

    // Helper to build rewrite URL preserving query string.
    const buildUrl = (newPath: string) => {
        const url = request.nextUrl.clone();
        url.pathname = newPath;
        url.search = search;
        return url;
    };

    // 1. Root domain (platform landing)
    if (
        hostname === baseDomain ||
        hostname === `www.${baseDomain}` ||
        (baseDomain === 'localhost' && (hostname === 'localhost' || hostname === 'www.localhost'))
    ) {
        const platformPath =
            pathname === '/' ? '/platform' : `/platform${pathname}`;
        return NextResponse.rewrite(buildUrl(platformPath));
    }

    // 2. Reserved subdomains
    if (hostname.endsWith(`.${baseDomain}`)) {
        const subdomain = hostname.slice(0, -`.${baseDomain}`.length);
        if (RESERVED_SUBDOMAINS.has(subdomain)) {
            let newPath;
            switch (subdomain) {
                case 'app':
                    newPath = pathname === '/' ? '/app' : `/app${pathname}`;
                    break;
                case 'admin':
                    newPath = pathname === '/' ? '/admin' : `/admin${pathname}`;
                    break;
                case 'api':
                    newPath = pathname === '/' ? '/api' : `/api${pathname}`;
                    break;
                case 'www':
                    // Already handled as root, but keep for safety.
                    newPath = pathname === '/' ? '/platform' : `/platform${pathname}`;
                    break;
                default:
                    newPath = null;
            }
            if (newPath) {
                return NextResponse.rewrite(buildUrl(newPath));
            }
        }
    }

    // 3. Tenant resolution via subdomain
    let tenantSlug: string | null = null;
    if (hostname.endsWith(`.${baseDomain}`)) {
        const subdomain = hostname.slice(0, -`.${baseDomain}`.length);
        if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
            tenantSlug = subdomain;
        }
    }

    // 4. Tenant resolution via custom domain
    if (!tenantSlug) {
        // Remove "www." for custom domain matching.
        const normalizedForCustom = hostname.replace(/^www\./, '');
        tenantSlug = CUSTOM_DOMAIN_TENANT_MAP[normalizedForCustom] || null;
    }

    if (tenantSlug) {
        const newPath =
            pathname === '/' ? `/sites/${tenantSlug}` : `/sites/${tenantSlug}${pathname}`;

        // Clone headers and inject tenant slug for downstream use.
        const headers = new Headers(request.headers);
        headers.set('x-tenant-slug', tenantSlug);

        return NextResponse.rewrite(buildUrl(newPath), {
            request: { headers },
        });
    }

    // No tenant or special route matched; continue normally.
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};