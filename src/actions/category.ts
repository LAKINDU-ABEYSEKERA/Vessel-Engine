'use server';

import { and, eq, isNull, ne } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { after } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { categories, stores } from '@/db/schema';
import { CATEGORY_TYPES, isValidCategoryType } from '@/lib/categories';

const NAME_MIN = 2;
const NAME_MAX = 40;
const SLUG_MIN = 2;
const SLUG_MAX = 40;

const PG_UNIQUE_VIOLATION = '23505';

export type CategoryActionResult =
    | { ok: true; categoryId: string }
    | { ok: false; error: string; field?: 'name' | 'slug' | 'type' };

export type DeleteCategoryResult =
    | { ok: true }
    | { ok: false; error: string };

function normalizeSlug(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
}

function slugify(name: string): string {
    return normalizeSlug(name);
}

function validateSlug(slug: string): string | null {
    if (slug.length < SLUG_MIN) return `Slug must be at least ${SLUG_MIN} characters.`;
    if (slug.length > SLUG_MAX) return `Slug must be at most ${SLUG_MAX} characters.`;
    if (!/^[a-z0-9]/.test(slug)) return 'Slug must start with a letter or number.';
    if (!/[a-z0-9]$/.test(slug)) return 'Slug must end with a letter or number.';
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

async function findAvailableSlug(
    storeId: string,
    baseSlug: string,
    excludeCategoryId?: string
): Promise<string | null> {
    for (let suffix = 1; suffix <= 100; suffix++) {
        const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;

        const conditions = excludeCategoryId
            ? and(
                eq(categories.storeId, storeId),
                eq(categories.slug, candidate),
                ne(categories.id, excludeCategoryId)
            )
            : and(eq(categories.storeId, storeId), eq(categories.slug, candidate));

        const [existing] = await db
            .select({ id: categories.id })
            .from(categories)
            .where(conditions)
            .limit(1);

        if (!existing) return candidate;
    }
    return null;
}

interface ParsedCategoryInput {
    name: string;
    slug: string;
    type: string;
}

type ParseResult =
    | { ok: true; data: ParsedCategoryInput }
    | { ok: false; error: string; field?: 'name' | 'slug' | 'type' };

function parseCategoryForm(formData: FormData): ParseResult {
    const rawName = formData.get('name');
    if (typeof rawName !== 'string') return { ok: false, error: 'Name is required.', field: 'name' };
    const name = rawName.trim();
    if (name.length < NAME_MIN)
        return { ok: false, error: `Name must be at least ${NAME_MIN} characters.`, field: 'name' };
    if (name.length > NAME_MAX)
        return { ok: false, error: `Name must be at most ${NAME_MAX} characters.`, field: 'name' };

    const rawSlug = formData.get('slug');
    const slugInput =
        typeof rawSlug === 'string' && rawSlug.trim().length > 0 ? rawSlug : name;
    const slug = normalizeSlug(slugInput);
    const slugError = validateSlug(slug);
    if (slugError) return { ok: false, error: slugError, field: 'slug' };

    const rawType = formData.get('type');
    const type =
        typeof rawType === 'string' && isValidCategoryType(rawType) ? rawType : 'other';
    if (typeof rawType === 'string' && rawType.length > 0 && !isValidCategoryType(rawType)) {
        return { ok: false, error: 'Invalid category type.', field: 'type' };
    }

    return { ok: true, data: { name, slug, type } };
}

/* -------------------------------------------------------------------------- */
/*  Cache invalidation                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Schedules revalidation to run *after* the Server Action response is sent.
 *
 * Running revalidateTag/revalidatePath synchronously inside a Server Action
 * in Next.js 16 can corrupt the RSC payload streamed back to the browser
 * (surfacing as "Error in input stream"). `after()` defers the work until
 * the response is complete.
 *
 * The two-argument revalidateTag signature is required in Next.js 16 —
 * the single-argument form is deprecated and can misbehave.
 */
function scheduleRevalidation(subdomain: string, storeId: string) {
    after(() => {
        try {
            revalidatePath(`/app/stores/${subdomain}/sections`);
            revalidateTag(`categories-${storeId}`, 'max');
            revalidateTag(`store-${subdomain}`, 'max');
        } catch (err) {
            // Revalidation failures must not crash the request.
            console.error('[category revalidate]', err);
        }
    });
}

/* -------------------------------------------------------------------------- */
/*  Create                                                                     */
/* -------------------------------------------------------------------------- */

export async function createCategory(
    subdomain: string,
    formData: FormData
): Promise<CategoryActionResult> {
    const store = await resolveOwnedStore(subdomain);
    if (!store) return { ok: false, error: 'Store not found.' };

    const parsed = parseCategoryForm(formData);
    if (!parsed.ok) return { ok: false, error: parsed.error, field: parsed.field };

    const { name, slug, type } = parsed.data;

    const availableSlug = await findAvailableSlug(store.id, slug);
    if (!availableSlug) {
        return { ok: false, error: 'Could not generate a unique slug.', field: 'slug' };
    }

    try {
        const existing = await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.storeId, store.id));

        const [created] = await db
            .insert(categories)
            .values({
                storeId: store.id,
                name,
                slug: availableSlug,
                type,
                position: existing.length,
            })
            .returning({ id: categories.id });

        scheduleRevalidation(subdomain, store.id);

        return { ok: true, categoryId: created.id };
    } catch (err) {
        if (isPostgresError(err) && err.code === PG_UNIQUE_VIOLATION) {
            return { ok: false, error: 'That slug was just claimed. Please try another.', field: 'slug' };
        }
        console.error('[createCategory]', err);
        return { ok: false, error: 'Something went wrong. Please try again.' };
    }
}

/* -------------------------------------------------------------------------- */
/*  Update                                                                     */
/* -------------------------------------------------------------------------- */

export async function updateCategory(
    subdomain: string,
    categoryId: string,
    formData: FormData
): Promise<CategoryActionResult> {
    const store = await resolveOwnedStore(subdomain);
    if (!store) return { ok: false, error: 'Store not found.' };

    const [existing] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.storeId, store.id)))
        .limit(1);

    if (!existing) return { ok: false, error: 'Section not found.' };

    const parsed = parseCategoryForm(formData);
    if (!parsed.ok) return { ok: false, error: parsed.error, field: parsed.field };

    const { name, slug, type } = parsed.data;

    const availableSlug = await findAvailableSlug(store.id, slug, categoryId);
    if (!availableSlug) {
        return { ok: false, error: 'Could not generate a unique slug.', field: 'slug' };
    }

    try {
        await db
            .update(categories)
            .set({ name, slug: availableSlug, type, updatedAt: new Date() })
            .where(and(eq(categories.id, categoryId), eq(categories.storeId, store.id)));

        scheduleRevalidation(subdomain, store.id);

        return { ok: true, categoryId };
    } catch (err) {
        if (isPostgresError(err) && err.code === PG_UNIQUE_VIOLATION) {
            return { ok: false, error: 'That slug was just claimed. Please try another.', field: 'slug' };
        }
        console.error('[updateCategory]', err);
        return { ok: false, error: 'Something went wrong. Please try again.' };
    }
}

/* -------------------------------------------------------------------------- */
/*  Delete                                                                     */
/* -------------------------------------------------------------------------- */

export async function deleteCategory(
    subdomain: string,
    categoryId: string
): Promise<DeleteCategoryResult> {
    const store = await resolveOwnedStore(subdomain);
    if (!store) return { ok: false, error: 'Store not found.' };

    try {
        const deleted = await db
            .delete(categories)
            .where(and(eq(categories.id, categoryId), eq(categories.storeId, store.id)))
            .returning({ id: categories.id });

        if (deleted.length === 0) {
            return { ok: false, error: 'Section not found.' };
        }

        scheduleRevalidation(subdomain, store.id);

        return { ok: true };
    } catch (err) {
        console.error('[deleteCategory]', err);
        return { ok: false, error: 'Something went wrong. Please try again.' };
    }
}