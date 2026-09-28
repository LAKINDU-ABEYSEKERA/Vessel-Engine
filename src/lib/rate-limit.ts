interface Bucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();

interface RateLimitResult {
    ok: boolean;
    retryAfterMs: number;
}

/**
 * Simple in-memory rate limiter — good enough for dev / a single instance.
 * Swap the Map for Redis (Upstash) when we go multi-region.
 */
export function checkRateLimit(
    key: string,
    max: number,
    windowMs: number
): RateLimitResult {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });

        // Opportunistic cleanup so the Map doesn't grow without bound.
        if (buckets.size > 1000) {
            for (const [k, v] of buckets) {
                if (v.resetAt < now) buckets.delete(k);
            }
        }

        return { ok: true, retryAfterMs: 0 };
    }

    if (bucket.count >= max) {
        return { ok: false, retryAfterMs: bucket.resetAt - now };
    }

    bucket.count += 1;
    return { ok: true, retryAfterMs: 0 };
}