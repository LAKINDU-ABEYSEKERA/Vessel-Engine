export type Role = 'customer' | 'seller' | 'admin';

const ROLE_HIERARCHY: Record<Role, number> = {
    customer: 1,
    seller: 2,
    admin: 3,
};

export function isRole(value: unknown): value is Role {
    return value === 'customer' || value === 'seller' || value === 'admin';
}

export function roleAtLeast(actual: Role, minimum: Role): boolean {
    return ROLE_HIERARCHY[actual] >= ROLE_HIERARCHY[minimum];
}

/**
 * Compute the effective role for a user, considering both the DB role and
 * the ADMIN_EMAILS env override.
 *
 * Precedence:
 *   1. DB role of 'admin' — allows future DB-driven admin promotion
 *   2. Email present in ADMIN_EMAILS env var — bootstrap admin, no DB write
 *   3. DB role ('seller' or 'customer')
 *
 * Only ever called from server code — depends on a non-public env var.
 */
export function computeEffectiveRole(user: {
    email?: string | null;
    role?: string | null;
}): Role {
    if (user.role === 'admin') return 'admin';

    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        return 'admin';
    }

    if (user.role === 'seller') return 'seller';
    return 'customer';
}