'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';

import { verifyPassword, hashPassword, validatePassword } from '@/lib/password';

export type ChangePasswordResult =
    | { ok: true }
    | { ok: false; error: string; field?: 'current' | 'next' | 'general' };

export async function changePasswordAction(
    formData: FormData
): Promise<ChangePasswordResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, error: 'You must be signed in.', field: 'general' };
    }

    const rawCurrent = formData.get('currentPassword');
    const rawNext = formData.get('newPassword');

    if (typeof rawCurrent !== 'string' || typeof rawNext !== 'string') {
        return { ok: false, error: 'Invalid submission.', field: 'general' };
    }

    if (rawNext.length === 0) {
        return { ok: false, error: 'New password is required.', field: 'next' };
    }

    const [user] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

    if (!user) {
        return { ok: false, error: 'Account not found.', field: 'general' };
    }

    // A user may have signed up with Google and never set a password.
    // In that case we let them set one without requiring the current.
    if (user.passwordHash) {
        const valid = await verifyPassword(rawCurrent, user.passwordHash);
        if (!valid) {
            return {
                ok: false,
                error: 'Current password is incorrect.',
                field: 'current',
            };
        }
    }

    const pwError = validatePassword(rawNext);
    if (pwError) {
        return { ok: false, error: pwError, field: 'next' };
    }

    try {
        const passwordHash = await hashPassword(rawNext);
        await db
            .update(users)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(users.id, session.user.id));

        return { ok: true };
    } catch (err) {
        console.error('[changePasswordAction]', err);
        return { ok: false, error: 'Something went wrong. Please try again.', field: 'general' };
    }
}

export type UpdateProfileResult =
    | { ok: true }
    | { ok: false; error: string; field?: 'name' | 'general' };

const NAME_MIN = 2;
const NAME_MAX = 80;

export async function updateProfileAction(
    formData: FormData
): Promise<UpdateProfileResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, error: 'You must be signed in.', field: 'general' };
    }

    const rawName = formData.get('name');
    if (typeof rawName !== 'string') {
        return { ok: false, error: 'Invalid submission.', field: 'general' };
    }

    const name = rawName.trim();
    if (name.length < NAME_MIN) {
        return {
            ok: false,
            error: `Name must be at least ${NAME_MIN} characters.`,
            field: 'name',
        };
    }
    if (name.length > NAME_MAX) {
        return {
            ok: false,
            error: `Name must be at most ${NAME_MAX} characters.`,
            field: 'name',
        };
    }

    try {
        await db
            .update(users)
            .set({ name, updatedAt: new Date() })
            .where(eq(users.id, session.user.id));

        revalidatePath('/app', 'layout');
        return { ok: true };
    } catch (err) {
        console.error('[updateProfileAction]', err);
        return { ok: false, error: 'Something went wrong. Please try again.', field: 'general' };
    }
}