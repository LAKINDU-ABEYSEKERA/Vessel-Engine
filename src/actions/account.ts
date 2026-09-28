'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';

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