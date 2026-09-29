import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { computeEffectiveRole, roleAtLeast, type Role } from '@/lib/roles';

export type GuardUser = {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    avatarUrl: string | null;
    role: Role;
};

/**
 * Resolve the currently signed-in user with a fresh DB lookup. Returns null
 * if not signed in or if the user row is missing (stale session).
 *
 * This does NOT trust the JWT role — always hits the DB — so it's safe to
 * call from guards where stale roles would be a security problem.
 */
export async function getCurrentUser(): Promise<GuardUser | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const [row] = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            avatarUrl: users.avatarUrl,
            role: users.role,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        image: row.image,
        avatarUrl: row.avatarUrl,
        role: computeEffectiveRole({ email: row.email, role: row.role }),
    };
}

/**
 * Server-component guard. Redirects to login if unauthenticated, 404s if
 * the user's effective role is below the requested minimum. Returns the
 * user on success.
 *
 * Usage in a layout:
 *     const user = await requireRole('admin');
 */
export async function requireRole(minimum: Role): Promise<GuardUser> {
    const user = await getCurrentUser();
    if (!user) redirect('/app/login');
    if (!roleAtLeast(user.role, minimum)) notFound();
    return user;
}