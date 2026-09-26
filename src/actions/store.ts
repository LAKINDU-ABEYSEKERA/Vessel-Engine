'use server';

import { and, eq, isNull, ne } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { after } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { stores } from '@/db/schema';

const RESERVED_SUBDOMAINS = new Set<string>([
    'app', 'admin', 'api', 'www',
    'mail', 'email', 'smtp', 'imap', 'pop', 'mx', 'ftp', 'ns1', 'ns2',
    'auth', 'login', 'logout', 'signin', 'signup', 'oauth', 'account', 'portal',
    'dashboard', 'billing', 'payment', 'checkout', 'stripe', 'subscribe',
    'support', 'help', 'docs', 'status', 'legal', 'terms', 'privacy',
    'blog', 'news', 'press', 'careers', 'jobs',
    'cdn', 'static', 'assets', 'img', 'images', 'media', 'files',
    'test', 'dev', 'staging', 'demo', 'sandbox', 'preview',
    'webhook', 'webhooks', 'hook', 'hooks', 'integrations', 'apps',
]);

const SUBDOMAIN_MIN = 3;
const SUBDOMAIN_MAX = 30;
const NAME_MIN = 2;
const NAME_MAX = 60;

const PG_UNIQUE_VIOLATION = '23505';

export type CreateStoreResult =
    | { ok: true; subdomain: string }
    | { ok: false; error: string; field?: 'name' | 'subdomain' };

export type UpdateStoreResult =
    | { ok: true; subdomain: string }
    | { ok: false; error: string; field?: 'name' | 'subdomain' };

export type DeleteStoreResult =
    | { ok: true }
    | { ok: false; error: string };

function normalizeSubdomain(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
}

function validateSubdomain(subdomain: string): string | null {
    if (subdomain.length < SUBDOMAIN_MIN) return `Subdomain must be at least ${SUBDOMAIN_MIN} characters.`;
    if (subdomain.length > SUBDOMAIN_MAX) return `Subdomain must be at most ${SUBDOMAIN_MAX} characters.`;
    if (!/^[a-z0-9]/.test(subdomain)) return 'Subdomain must start with a letter or number.';
    if (!/[a-z0-9]$/.test(subdomain)) return 'Subdomain must end with a letter or number.';
    if (/^\d+$/.test(subdomain)) return 'Subdomain cannot be only numbers.';
    if (RESERVED_SUBDOMAINS.has(subdomain)) return 'This subdomain is reserved. Please choose another.';
    return null;
}

function validateName(name: string): string | null {
    if (name.length < NAME_MIN) return `Name must be at least ${NAME_MIN} characters.`;
    if (name.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters.`;
    return null;
}

interface PostgresError {
    code?: string;
    constraint?: string;
}

function isPostgresError(err: unknown): err is PostgresError {
    return typeof err === 'object' && err !== null && 'code' in err;
}

async function resolveOwnedStore(subdomain: string) {
    const session = await auth();
    if (!session?.user?.id) return null;

    const [store] = await db
        .select({ id: stores.id, subdomain: stores.subdomain })
        .from(stores)
        .where(
            and(
                eq(stores.subdomain, subdomain),
                eq(stores.userId, session.user.id),
                isNull(stores.deletedAt)
            )
        )
        .limit(1);

    return store ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Create                                                                     */
/* -------------------------------------------------------------------------- */

export async function createStore(formData: FormData): Promise<CreateStoreResult> {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: 'You must be signed in.' };
    const userId = session.user.id;

    const rawName = formData.get('name');
    const rawSubdomain = formData.get('subdomain');
    if (typeof rawName !== 'string' || typeof rawSubdomain !== 'string') {
        return { ok: false, error: 'Invalid submission.' };
    }

    const name = rawName.trim();
    const subdomain = normalizeSubdomain(rawSubdomain);

    const nameError = validateName(name);
    if (nameError) return { ok: false, error: nameError, field: 'name' };

    const subdomainError = validateSubdomain(subdomain);
    if (subdomainError) return { ok: false, error: subdomainError, field: 'subdomain' };

    const [existing] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(and(eq(stores.subdomain, subdomain), isNull(stores.deletedAt)))
        .limit(1);

    if (existing) {
        return { ok: false, error: 'That subdomain is already taken.', field: 'subdomain' };
    }

    try {
        const [created] = await db
            .insert(stores)
            .values({ userId, name, subdomain })
            .returning({ subdomain: stores.subdomain });

        after(() => {
            try {
                revalidatePath('/app');
                revalidateTag('tenant-store', 'max');
                revalidateTag(`store-${created.subdomain}`, 'max');
            } catch (err) {
                console.error('[createStore revalidate]', err);
            }
        });

        return { ok: true, subdomain: created.subdomain };
    } catch (err) {
        if (isPostgresError(err) && err.code === PG_UNIQUE_VIOLATION) {
            return {
                ok: false,
                error: 'That subdomain was just claimed. Please try another.',
                field: 'subdomain',
            };
        }
        console.error('[createStore]', err);
        return { ok: false, error: 'Something went wrong. Please try again.' };
    }
}

/* -------------------------------------------------------------------------- */
/*  Update                                                                     */
/* -------------------------------------------------------------------------- */

export async function updateStore(
    subdomain: string,
    formData: FormData
): Promise<UpdateStoreResult> {
    const store = await resolveOwnedStore(subdomain);
    if (!store) return { ok: false, error: 'Store not found.' };

    const rawName = formData.get('name');
    const rawSubdomain = formData.get('subdomain');
    if (typeof rawName !== 'string' || typeof rawSubdomain !== 'string') {
        return { ok: false, error: 'Invalid submission.' };
    }

    const name = rawName.trim();
    const newSubdomain = normalizeSubdomain(rawSubdomain);

    const nameError = validateName(name);
    if (nameError) return { ok: false, error: nameError, field: 'name' };

    const subdomainError = validateSubdomain(newSubdomain);
    if (subdomainError) return { ok: false, error: subdomainError, field: 'subdomain' };

    const subdomainChanged = newSubdomain !== store.subdomain;

    if (subdomainChanged) {
        const [collision] = await db
            .select({ id: stores.id })
            .from(stores)
            .where(
                and(
                    eq(stores.subdomain, newSubdomain),
                    ne(stores.id, store.id),
                    isNull(stores.deletedAt)
                )
            )
            .limit(1);

        if (collision) {
            return { ok: false, error: 'That subdomain is already taken.', field: 'subdomain' };
        }
    }

    try {
        await db
            .update(stores)
            .set({ name, subdomain: newSubdomain, updatedAt: new Date() })
            .where(eq(stores.id, store.id));

        after(() => {
            try {
                revalidateTag(`store-${store.subdomain}`, 'max');
                revalidateTag(`store-${newSubdomain}`, 'max');
                revalidateTag('tenant-store', 'max');
                revalidatePath('/app');
                revalidatePath(`/app/stores/${newSubdomain}`, 'layout');
                if (subdomainChanged) {
                    revalidatePath(`/app/stores/${store.subdomain}`, 'layout');
                }
            } catch (err) {
                console.error('[updateStore revalidate]', err);
            }
        });

        return { ok: true, subdomain: newSubdomain };
    } catch (err) {
        if (isPostgresError(err) && err.code === PG_UNIQUE_VIOLATION) {
            return {
                ok: false,
                error: 'That subdomain was just claimed. Please try another.',
                field: 'subdomain',
            };
        }
        console.error('[updateStore]', err);
        return { ok: false, error: 'Something went wrong. Please try again.' };
    }
}

/* -------------------------------------------------------------------------- */
/*  Delete (soft)                                                              */
/* -------------------------------------------------------------------------- */

export async function deleteStore(
    subdomain: string,
    confirmText: string
): Promise<DeleteStoreResult> {
    const store = await resolveOwnedStore(subdomain);
    if (!store) return { ok: false, error: 'Store not found.' };

    if (confirmText.trim() !== store.subdomain) {
        return { ok: false, error: 'Confirmation text does not match.' };
    }

    try {
        await db
            .update(stores)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(stores.id, store.id));

        after(() => {
            try {
                revalidateTag(`store-${store.subdomain}`, 'max');
                revalidateTag('tenant-store', 'max');
                revalidatePath('/app');
                revalidatePath('/app', 'layout');
            } catch (err) {
                console.error('[deleteStore revalidate]', err);
            }
        });

        return { ok: true };
    } catch (err) {
        console.error('[deleteStore]', err);
        return { ok: false, error: 'Something went wrong. Please try again.' };
    }
}