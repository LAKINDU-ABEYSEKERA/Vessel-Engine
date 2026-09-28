'use server';

import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { s3, S3_BUCKET, S3_PUBLIC_URL } from '@/lib/s3';

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const EXT_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type AvatarUploadUrlResult =
    | { ok: true; uploadUrl: string; publicUrl: string }
    | { ok: false; error: string };

/**
 * Returns a presigned PUT URL for the caller's avatar.
 * Key layout: `users/{userId}/avatar/{uuid}.{ext}`
 * A new UUID per upload means the CDN caches are invalidated automatically —
 * the old image stays in R2 as a cold object (see cleanup TODO).
 */
export async function createAvatarUploadUrl(
    contentType: string,
    fileSize: number
): Promise<AvatarUploadUrlResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, error: 'You must be signed in.' };
    }

    if (!ALLOWED_MIME_TYPES.has(contentType)) {
        return { ok: false, error: 'Only JPEG, PNG, and WebP images are allowed.' };
    }

    if (fileSize <= 0 || fileSize > MAX_SIZE_BYTES) {
        return { ok: false, error: 'Image must be under 5 MB.' };
    }

    const ext = EXT_BY_MIME[contentType];
    const key = `users/${session.user.id}/avatar/${randomUUID()}.${ext}`;

    try {
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
        const publicUrl = `${S3_PUBLIC_URL}/${key}`;

        return { ok: true, uploadUrl, publicUrl };
    } catch (err) {
        console.error('[createAvatarUploadUrl]', err);
        return { ok: false, error: 'Could not prepare upload. Please try again.' };
    }
}

/* -------------------------------------------------------------------------- */
/*  Persist the uploaded avatar URL onto the user row                          */
/* -------------------------------------------------------------------------- */

export type UpdateAvatarResult = { ok: true } | { ok: false; error: string };

export async function updateAvatarAction(
    avatarUrl: string | null
): Promise<UpdateAvatarResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, error: 'You must be signed in.' };
    }

    // Validate the URL shape — we only accept URLs from our own R2 public host.
    // This prevents a malicious caller from pointing the field at an arbitrary
    // external resource.
    if (avatarUrl !== null) {
        let parsed: URL;
        try {
            parsed = new URL(avatarUrl);
        } catch {
            return { ok: false, error: 'Invalid image URL.' };
        }
        const expectedHost = new URL(S3_PUBLIC_URL).host;
        if (parsed.host !== expectedHost) {
            return { ok: false, error: 'Invalid image URL.' };
        }
        const expectedPrefix = `/users/${session.user.id}/avatar/`;
        if (!parsed.pathname.startsWith(expectedPrefix)) {
            return { ok: false, error: 'Invalid image URL.' };
        }
    }

    try {
        await db
            .update(users)
            .set({ avatarUrl, updatedAt: new Date() })
            .where(eq(users.id, session.user.id));

        // Sidebar is rendered by the dashboard layout, which is a Server
        // Component tree — revalidate it so the new avatar shows immediately.
        revalidatePath('/app', 'layout');

        return { ok: true };
    } catch (err) {
        console.error('[updateAvatarAction]', err);
        return { ok: false, error: 'Could not save avatar. Please try again.' };
    }
}