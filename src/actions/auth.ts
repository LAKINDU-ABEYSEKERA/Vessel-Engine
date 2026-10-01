'use server';

import { AuthError } from 'next-auth';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { signIn, signOut } from '@/auth';
import { db } from '@/db';
import { passwordResetTokens, users } from '@/db/schema';
import { hashPassword, validatePassword } from '@/lib/password';
import {
    generateResetToken,
    hashResetToken,
    RESET_TOKEN_TTL_MS,
} from '@/lib/reset-tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* -------------------------------------------------------------------------- */
/*  Sign up                                                                    */
/* -------------------------------------------------------------------------- */

export type SignupRole = 'customer' | 'seller';

export type SignupResult =
    | { ok: true }
    | { ok: false; error: string; field?: 'name' | 'email' | 'password' | 'role' | 'general' };

/**
 * Server Action bound to the signup form via `useActionState`.
 * Accepts a `role` field ('customer' | 'seller') so we can route the user
 * to the correct dashboard immediately after account creation.
 */
export async function signUpAction(
    _prevState: SignupResult | null,
    formData: FormData
): Promise<SignupResult> {
    const rawName = formData.get('name');
    const rawEmail = formData.get('email');
    const rawPassword = formData.get('password');
    const rawRole = formData.get('role');

    if (
        typeof rawName !== 'string' ||
        typeof rawEmail !== 'string' ||
        typeof rawPassword !== 'string'
    ) {
        return { ok: false, error: 'Invalid submission.', field: 'general' };
    }

    const role: SignupRole = rawRole === 'seller' ? 'seller' : 'customer';

    const name = rawName.trim();
    const email = rawEmail.toLowerCase().trim();
    const password = rawPassword;

    if (name.length < 2)
        return { ok: false, error: 'Name must be at least 2 characters.', field: 'name' };
    if (name.length > 80)
        return { ok: false, error: 'Name must be at most 80 characters.', field: 'name' };
    if (!EMAIL_RE.test(email))
        return { ok: false, error: 'Please enter a valid email address.', field: 'email' };

    const pwError = validatePassword(password);
    if (pwError) return { ok: false, error: pwError, field: 'password' };

    const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (existing) {
        return {
            ok: false,
            error: 'An account with that email already exists.',
            field: 'email',
        };
    }

    const passwordHash = await hashPassword(password);

    try {
        await db.insert(users).values({
            name,
            email,
            passwordHash,
            role,
        });
    } catch (err) {
        console.error('[signUpAction] insert failed:', err);
        return { ok: false, error: 'Something went wrong. Please try again.', field: 'general' };
    }

    const redirectTo = role === 'seller' ? '/app' : '/app/customer';

    try {
        await signIn('credentials', { email, password, redirectTo });
    } catch (err) {
        if (err instanceof AuthError) {
            return {
                ok: false,
                error: 'Account created — please sign in manually.',
                field: 'general',
            };
        }
        throw err; // NEXT_REDIRECT — must propagate
    }

    return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Login                                                                      */
/* -------------------------------------------------------------------------- */

export type LoginResult =
    | { ok: true }
    | { ok: false; error: string };

/**
 * Server Action bound to the login form via `useActionState`.
 * Looks up the user's role first so the post-login redirect lands on the
 * correct dashboard (sellers → /app, customers → /app/customer).
 */
export async function loginAction(
    _prevState: LoginResult | null,
    formData: FormData
): Promise<LoginResult> {
    const rawEmail = formData.get('email');
    const rawPassword = formData.get('password');

    if (typeof rawEmail !== 'string' || typeof rawPassword !== 'string') {
        return { ok: false, error: 'Invalid submission.' };
    }

    const email = rawEmail.toLowerCase().trim();
    const password = rawPassword;

    const rl = checkRateLimit(`login:${email}`, 5, 5 * 60 * 1000);
    if (!rl.ok) {
        return { ok: false, error: 'Too many attempts. Try again in a few minutes.' };
    }

    // Look up role up-front so the redirect lands on the right dashboard.
    // If the user doesn't exist we still hand off to signIn — which will
    // fail with AuthError — so this lookup doesn't leak existence by itself.
    const [record] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    const redirectTo =
        record?.role === 'seller' || record?.role === 'admin'
            ? '/app'
            : '/app/customer';

    try {
        await signIn('credentials', { email, password, redirectTo });
    } catch (err) {
        if (err instanceof AuthError) {
            return { ok: false, error: 'Invalid email or password.' };
        }
        throw err; // NEXT_REDIRECT — must propagate
    }

    return { ok: true };
}
/* -------------------------------------------------------------------------- */
/*  Logout                                                                     */
/* -------------------------------------------------------------------------- */

export async function logoutAction(): Promise<void> {
    await signOut({ redirectTo: '/app/login' });
}

/* -------------------------------------------------------------------------- */
/*  Forgot password                                                            */
/* -------------------------------------------------------------------------- */

export type ForgotPasswordResult =
    | { ok: true }
    | { ok: false; error: string };

export async function forgotPasswordAction(
    formData: FormData
): Promise<ForgotPasswordResult> {
    const rawEmail = formData.get('email');
    if (typeof rawEmail !== 'string') {
        return { ok: false, error: 'Invalid submission.' };
    }

    const email = rawEmail.toLowerCase().trim();
    const rl = checkRateLimit(`forgot:${email}`, 3, 15 * 60 * 1000);
    if (!rl.ok) {
        return { ok: false, error: 'Too many requests. Try again in a few minutes.' };
    }

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (!user) return { ok: true };

    await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
            and(
                eq(passwordResetTokens.userId, user.id),
                isNull(passwordResetTokens.usedAt)
            )
        );

    const rawToken = generateResetToken();
    const tokenHash = hashResetToken(rawToken);

    await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    try {
        await sendPasswordResetEmail(email, rawToken);
    } catch (err) {
        console.error('[forgotPasswordAction] send failed:', err);
    }

    return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Reset password                                                             */
/* -------------------------------------------------------------------------- */

export type ResetPasswordResult =
    | { ok: true }
    | { ok: false; error: string; field?: 'password' | 'general' };

export async function resetPasswordAction(
    formData: FormData
): Promise<ResetPasswordResult> {
    const rawToken = formData.get('token');
    const rawPassword = formData.get('password');

    if (typeof rawToken !== 'string' || typeof rawPassword !== 'string') {
        return { ok: false, error: 'Invalid submission.', field: 'general' };
    }

    const pwError = validatePassword(rawPassword);
    if (pwError) return { ok: false, error: pwError, field: 'password' };

    const tokenHash = hashResetToken(rawToken);

    const [record] = await db
        .select()
        .from(passwordResetTokens)
        .where(
            and(
                eq(passwordResetTokens.tokenHash, tokenHash),
                isNull(passwordResetTokens.usedAt),
                gt(passwordResetTokens.expiresAt, new Date())
            )
        )
        .limit(1);

    if (!record) {
        return {
            ok: false,
            error: 'This reset link is invalid or has expired.',
            field: 'general',
        };
    }

    const passwordHash = await hashPassword(rawPassword);
    const now = new Date();

    await db
        .update(users)
        .set({ passwordHash, updatedAt: now })
        .where(eq(users.id, record.userId));

    await db
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(eq(passwordResetTokens.id, record.id));

    return { ok: true };
}