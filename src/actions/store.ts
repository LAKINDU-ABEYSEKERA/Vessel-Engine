'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { stores } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const RESERVED_SUBDOMAINS = new Set(['app', 'admin', 'api', 'www', 'mail', 'support']);

export async function createStore(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: 'Unauthorized.' };
    }

    const name = formData.get('name') as string;
    let subdomain = formData.get('subdomain') as string;

    // Basic Validation
    if (!name || name.trim().length < 2) {
        return { error: 'Store name must be at least 2 characters.' };
    }
    if (!subdomain || subdomain.trim().length < 3) {
        return { error: 'Subdomain must be at least 3 characters.' };
    }

    // Normalize and sanitize subdomain
    subdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (RESERVED_SUBDOMAINS.has(subdomain)) {
        return { error: 'This subdomain is reserved and cannot be used.' };
    }

    // Uniqueness Check
    const existing = await db
        .select({ id: stores.id })
        .from(stores)
        .where(
            or(
                eq(stores.subdomain, subdomain),
                eq(stores.userId, session.user.id) // Currently enforcing 1 store per user
            )
        )
        .limit(1);

    if (existing.length > 0) {
        return { error: 'Subdomain is already taken or you already own a store.' };
    }

    // Insert
    try {
        await db.insert(stores).values({
            userId: session.user.id,
            name: name.trim(),
            subdomain,
        });

        revalidatePath('/app');
        return { success: true };
    } catch (err) {
        console.error('[createStore]', err);
        return { error: 'An unexpected error occurred while creating your store.' };
    }
}