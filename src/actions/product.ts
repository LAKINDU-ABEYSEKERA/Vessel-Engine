'use server';

import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { after } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { categories, productCategories, products, stores } from '@/db/schema';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const NAME_MIN = 2;
const NAME_MAX = 120;

const SLUG_MIN = 2;
const SLUG_MAX = 80;

const DESCRIPTION_MAX = 4000;

const PRICE_MAX_CENTS = 99_999_999;
const PRICE_MIN_CENTS = 1;

const INVENTORY_MAX = 1_000_000;

const PG_UNIQUE_VIOLATION = '23505';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ProductActionResult =
    | { ok: true; productId: string }
    | { ok: false; error: string; field?: ProductField };

export type DeleteProductResult =
    | { ok: true }
    | { ok: false; error: string };

export type ProductField =
    | 'name'
    | 'slug'
    | 'description'
    | 'priceInCents'
    | 'inventory'
    | 'assetUrl'
    | 'imageUrl'
    | 'isDigital';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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
    if (slug.length < SLUG_MIN) {
        return `Slug must be at least ${SLUG_MIN} characters.`;
    }
    if (slug.length > SLUG_MAX) {
        return `Slug must be at most ${SLUG_MAX} characters.`;
    }
    if (!/^[a-z0-9]/.test(slug)) {
        return 'Slug must start with a letter or number.';
    }
    if (!/[a-z0-9]$/.test(slug)) {
        return 'Slug must end with a letter or number.';
    }
    return null;
}

function validateUrl(url: string | null | undefined, required: boolean): string | null {
    if (!url || url.trim() === '') {
        return required ? 'A URL is required.' : null;
    }
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return 'URL must start with http:// or https://.';
        }
        return null;
    } catch {
        return 'Please enter a valid URL.';
    }
}

function parsePriceToCents(raw: string): number | null {
    const cleaned = raw.trim().replace(/[$,]/g, '');
    if (cleaned === '') return null;
    const dollars = Number(cleaned);
    if (!Number.isFinite(dollars)) return null;
    const cents = Math.round(dollars * 100);
    return cents;
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
    excludeProductId?: string
): Promise<string | null> {
    for (let suffix = 1; suffix <= 100; suffix++) {
        const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;

        const conditions = excludeProductId
            ? and(
                eq(products.storeId, storeId),
                eq(products.slug, candidate),
                ne(products.id, excludeProductId)
            )
            : and(eq(products.storeId, storeId), eq(products.slug, candidate));

        const [existing] = await db
            .select({ id: products.id })
            .from(products)
            .where(conditions)
            .limit(1);

        if (!existing) return candidate;
    }
    return null;
}

async function resolveOwnedCategoryIds(
    storeId: string,
    formData: FormData
): Promise<string[]> {
    const raw = formData
        .getAll('categoryIds')
        .filter((v): v is string => typeof v === 'string' && v.length > 0);

    if (raw.length === 0) return [];

    const owned = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
            and(
                eq(categories.storeId, storeId),
                inArray(categories.id, raw)
            )
        );

    return owned.map((c) => c.id);
}

/**
 * Defers revalidation to after the response is sent.
 *
 * Running revalidateTag / revalidatePath synchronously inside a Server
 * Action in Next.js 16 corrupts the RSC payload streamed to the client —
 * the browser surfaces this as "Error in input stream". Wrapping in
 * `after()` prevents that. The second argument to revalidateTag ('max')
 * is now required by Next.js 16.
 */
function scheduleProductRevalidation(
    subdomain: string,
    storeId: string,
    extraPaths: string[] = []
) {
    after(() => {
        try {
            revalidateTag(`products-${storeId}`, 'max');
            revalidateTag(`store-${subdomain}`, 'max');
            revalidateTag(`categories-${storeId}`, 'max');
            revalidatePath(`/app/stores/${subdomain}/products`);
            for (const path of extraPaths) {
                revalidatePath(path);
            }
        } catch (err) {
            console.error('[product revalidate]', err);
        }
    });
}

/* -------------------------------------------------------------------------- */
/*  Shared parsing                                                             */
/* -------------------------------------------------------------------------- */

interface ParsedProductInput {
    name: string;
    slug: string;
    description: string | null;
    priceInCents: number;
    inventory: number;
    isDigital: boolean;
    assetUrl: string | null;
    imageUrl: string | null;
}

type ParseResult =
    | { ok: true; data: ParsedProductInput }
    | { ok: false; error: string; field?: ProductField };

function parseProductForm(formData: FormData): ParseResult {
    const rawName = formData.get('name');
    if (typeof rawName !== 'string') {
        return { ok: false, error: 'Name is required.', field: 'name' };
    }
    const name = rawName.trim();
    if (name.length < NAME_MIN) {
        return { ok: false, error: `Name must be at least ${NAME_MIN} characters.`, field: 'name' };
    }
    if (name.length > NAME_MAX) {
        return { ok: false, error: `Name must be at most ${NAME_MAX} characters.`, field: 'name' };
    }

    const rawSlug = formData.get('slug');
    const slugInput =
        typeof rawSlug === 'string' && rawSlug.trim().length > 0 ? rawSlug : name;
    const slug = normalizeSlug(slugInput);
    const slugError = validateSlug(slug);
    if (slugError) {
        return { ok: false, error: slugError, field: 'slug' };
    }

    const rawDescription = formData.get('description');
    const description =
        typeof rawDescription === 'string' && rawDescription.trim().length > 0
            ? rawDescription.trim()
            : null;
    if (description && description.length > DESCRIPTION_MAX) {
        return {
            ok: false,
            error: `Description must be at most ${DESCRIPTION_MAX} characters.`,
            field: 'description',
        };
    }

    const rawPrice = formData.get('price');
    if (typeof rawPrice !== 'string') {
        return { ok: false, error: 'Price is required.', field: 'priceInCents' };
    }
    const priceInCents = parsePriceToCents(rawPrice);
    if (priceInCents === null) {
        return { ok: false, error: 'Please enter a valid price.', field: 'priceInCents' };
    }
    if (priceInCents < PRICE_MIN_CENTS) {
        return { ok: false, error: 'Price must be greater than $0.00.', field: 'priceInCents' };
    }
    if (priceInCents > PRICE_MAX_CENTS) {
        return { ok: false, error: 'Price cannot exceed $999,999.99.', field: 'priceInCents' };
    }

    const isDigital =
        formData.get('isDigital') === 'on' || formData.get('isDigital') === 'true';

    let inventory = 0;
    if (!isDigital) {
        const rawInventory = formData.get('inventory');
        if (typeof rawInventory !== 'string') {
            return { ok: false, error: 'Inventory is required.', field: 'inventory' };
        }
        const parsed = Number(rawInventory.trim());
        if (!Number.isInteger(parsed) || parsed < 0) {
            return {
                ok: false,
                error: 'Inventory must be a whole number ≥ 0.',
                field: 'inventory',
            };
        }
        if (parsed > INVENTORY_MAX) {
            return {
                ok: false,
                error: `Inventory cannot exceed ${INVENTORY_MAX.toLocaleString()}.`,
                field: 'inventory',
            };
        }
        inventory = parsed;
    }

    const rawAssetUrl = formData.get('assetUrl');
    const assetUrl =
        typeof rawAssetUrl === 'string' && rawAssetUrl.trim().length > 0
            ? rawAssetUrl.trim()
            : null;
    const assetUrlError = validateUrl(assetUrl, isDigital);
    if (assetUrlError) {
        return { ok: false, error: assetUrlError, field: 'assetUrl' };
    }

    const rawImageUrl = formData.get('imageUrl');
    const imageUrl =
        typeof rawImageUrl === 'string' && rawImageUrl.trim().length > 0
            ? rawImageUrl.trim()
            : null;
    const imageUrlError = validateUrl(imageUrl, false);
    if (imageUrlError) {
        return { ok: false, error: imageUrlError, field: 'imageUrl' };
    }

    return {
        ok: true,
        data: {
            name,
            slug,
            description,
            priceInCents,
            inventory,
            isDigital,
            assetUrl: isDigital ? assetUrl : null,
            imageUrl,
        },
    };
}

/* -------------------------------------------------------------------------- */
/*  Create                                                                     */
/* -------------------------------------------------------------------------- */

export async function createProduct(
    subdomain: string,
    formData: FormData
): Promise<ProductActionResult> {
    const store = await resolveOwnedStore(subdomain);
    if (!store) return { ok: false, error: 'Store not found.' };

    const parsed = parseProductForm(formData);
    if (!parsed.ok) return { ok: false, error: parsed.error, field: parsed.field };

    const { slug, name, ...rest } = parsed.data;

    const availableSlug = await findAvailableSlug(store.id, slug);
    if (!availableSlug) {
        return {
            ok: false,
            error: 'Could not generate a unique slug. Please adjust the name.',
            field: 'slug',
        };
    }

    const categoryIds = await resolveOwnedCategoryIds(store.id, formData);

    try {
        const [created] = await db
            .insert(products)
            .values({
                storeId: store.id,
                slug: availableSlug,
                name,
                ...rest,
            })
            .returning({ id: products.id });

        if (categoryIds.length > 0) {
            await db.insert(productCategories).values(
                categoryIds.map((categoryId) => ({
                    productId: created.id,
                    categoryId,
                }))
            );
        }

        scheduleProductRevalidation(subdomain, store.id);

        return { ok: true, productId: created.id };
    } catch (err) {
        if (isPostgresError(err) && err.code === PG_UNIQUE_VIOLATION) {
            return {
                ok: false,
                error: 'That slug was just claimed. Please try another.',
                field: 'slug',
            };
        }
        console.error('[createProduct]', err);
        return { ok: false, error: 'Something went wrong. Please try again.' };
    }
}

/* -------------------------------------------------------------------------- */
/*  Update                                                                     */
/* -------------------------------------------------------------------------- */

export async function updateProduct(
    subdomain: string,
    productId: string,
    formData: FormData
): Promise<ProductActionResult> {
    const store = await resolveOwnedStore(subdomain);
    if (!store) return { ok: false, error: 'Store not found.' };

    const [existing] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
        .limit(1);

    if (!existing) return { ok: false, error: 'Product not found.' };

    const parsed = parseProductForm(formData);
    if (!parsed.ok) return { ok: false, error: parsed.error, field: parsed.field };

    const { slug, name, ...rest } = parsed.data;

    const availableSlug = await findAvailableSlug(store.id, slug, productId);
    if (!availableSlug) {
        return {
            ok: false,
            error: 'Could not generate a unique slug. Please adjust the name.',
            field: 'slug',
        };
    }

    const categoryIds = await resolveOwnedCategoryIds(store.id, formData);

    try {
        await db
            .update(products)
            .set({
                slug: availableSlug,
                name,
                ...rest,
                updatedAt: new Date(),
            })
            .where(and(eq(products.id, productId), eq(products.storeId, store.id)));

        await db
            .delete(productCategories)
            .where(eq(productCategories.productId, productId));

        if (categoryIds.length > 0) {
            await db.insert(productCategories).values(
                categoryIds.map((categoryId) => ({
                    productId,
                    categoryId,
                }))
            );
        }

        scheduleProductRevalidation(subdomain, store.id);

        return { ok: true, productId };
    } catch (err) {
        if (isPostgresError(err) && err.code === PG_UNIQUE_VIOLATION) {
            return {
                ok: false,
                error: 'That slug was just claimed. Please try another.',
                field: 'slug',
            };
        }
        console.error('[updateProduct]', err);
        return { ok: false, error: 'Something went wrong. Please try again.' };
    }
}

/* -------------------------------------------------------------------------- */
/*  Delete                                                                     */
/* -------------------------------------------------------------------------- */

export async function deleteProduct(
    subdomain: string,
    productId: string
): Promise<DeleteProductResult> {
    const store = await resolveOwnedStore(subdomain);
    if (!store) return { ok: false, error: 'Store not found.' };

    try {
        const deleted = await db
            .delete(products)
            .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
            .returning({ id: products.id });

        if (deleted.length === 0) return { ok: false, error: 'Product not found.' };

        scheduleProductRevalidation(subdomain, store.id);

        return { ok: true };
    } catch (err) {
        if (isPostgresError(err) && err.code === '23503') {
            return {
                ok: false,
                error: 'Cannot delete — this product is referenced by existing orders.',
            };
        }
        console.error('[deleteProduct]', err);
        return { ok: false, error: 'Something went wrong. Please try again.' };
    }
}