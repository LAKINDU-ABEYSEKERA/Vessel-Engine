'use server';

import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { and, eq, isNull } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import { stores } from '@/db/schema';
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

export type UploadUrlResult =
    | { ok: true; uploadUrl: string; publicUrl: string }
    | { ok: false; error: string };

export async function createProductImageUploadUrl(
    subdomain: string,
    contentType: string,
    fileSize: number
): Promise<UploadUrlResult> {
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

    const [store] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(
            and(
                eq(stores.subdomain, subdomain),
                eq(stores.userId, session.user.id),
                isNull(stores.deletedAt)
            )
        )
        .limit(1);

    if (!store) {
        return { ok: false, error: 'Store not found.' };
    }

    const ext = EXT_BY_MIME[contentType];
    const key = `stores/${store.id}/products/${randomUUID()}.${ext}`;

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
        console.error('[createProductImageUploadUrl]', err);
        return { ok: false, error: 'Could not prepare upload. Please try again.' };
    }
}