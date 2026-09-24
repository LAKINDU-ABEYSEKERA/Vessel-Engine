import { NextRequest, NextResponse } from 'next/server';
import { BASE_DOMAIN } from '@/lib/config';

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
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
        return 'localhost';
    }
    if (hostname === 'lvh.me' || hostname.endsWith('.lvh.me')) {
        return 'lvh.me';
    }
    return BASE_DOMAIN;
}

/** True when the path is exactly `/app` or a child of it (`/app/login`). */
function isAppPath(pathname: string): boolean {
    return pathname === '/app' || pathname.startsWith('/app/');
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ------------------------------------------------------------------
    // 0. Hard bypass — must run BEFORE any tenant/subdomain rewriting.
    //
    //    `/api/*`    → Stripe webhook + Auth.js handlers + fulfillment
    //    `/app/*`    → Creator Dashboard (path-based in local dev)
    //    `_next/*`   → Framework internals
    //    dot paths   → Static assets
    // ------------------------------------------------------------------
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/_static') ||
        isAppPath(pathname) ||
        pathname === '/favicon.ico' ||
        pathname === '/robots.txt' ||
        pathname === '/sitemap.xml' ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    const host = request.headers.get('host');
    const hostname = normalizeHost(host);
    const baseDomain = getBaseDomainForHost(hostname);
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
        (baseDomain === 'localhost' &&
            (hostname === 'localhost' || hostname === 'www.localhost'))
    ) {
        const platformPath =
            pathname === '/' ? '/platform' : `/platform${pathname}`;
        return NextResponse.rewrite(buildUrl(platformPath));
    }

    // 2. Reserved subdomains
    if (hostname.endsWith(`.${baseDomain}`)) {
        const subdomain = hostname.slice(0, -`.${baseDomain}`.length);
        if (RESERVED_SUBDOMAINS.has(subdomain)) {
            let newPath: string | null;
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
        const normalizedForCustom = hostname.replace(/^www\./, '');
        tenantSlug = CUSTOM_DOMAIN_TENANT_MAP[normalizedForCustom] || null;
    }

    if (tenantSlug) {
        const newPath =
            pathname === '/'
                ? `/sites/${tenantSlug}`
                : `/sites/${tenantSlug}${pathname}`;

        const headers = new Headers(request.headers);
        headers.set('x-tenant-slug', tenantSlug);

        return NextResponse.rewrite(buildUrl(newPath), {
            request: { headers },
        });
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
    ],
};