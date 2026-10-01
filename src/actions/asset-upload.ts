'use server';

import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { and, eq, isNull } from 'drizzle-orm';

import { auth } from '@/auth';
import { db } from '@/db';
import { stores } from '@/db/schema';
import { s3, S3_BUCKET } from '@/lib/s3';

/** 500 MB — large enough for video courses and high-res asset packs. */
const MAX_SIZE_BYTES = 500 * 1024 * 1024;

/**
 * Allowlist of safe delivery file extensions. Deliberately excludes
 * `.html`, `.svg`, `.js` and similar formats — those could be served as
 * active content if the R2 bucket ever had a permissive public policy.
 */
const ALLOWED_EXTENSIONS = new Set([
    // archives
    'zip', 'rar', '7z', 'tar', 'gz',
    // documents
    'pdf', 'epub', 'mobi', 'txt', 'md', 'csv',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'json', 'xml',
    // audio
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a',
    // video
    'mp4', 'mov', 'webm',
    // design
    'psd', 'ai', 'fig', 'sketch', 'xd',
    // images (raster only — no SVG)
    'png', 'jpg', 'jpeg', 'webp', 'gif',
]);

export type AssetUploadUrlResult =
    | { ok: true; uploadUrl: string; filename: string }
    | { ok: false; error: string };

/**
 * Returns a presigned PUT URL for a seller to upload a digital product
 * asset. The key is scoped to the store so tenants can't write into each
 * other's folders, and the fulfillment route resolves the exact same key
 * at download time.
 *
 * Returns the **bare filename** (not a URL, not the full key). The caller
 * stores it in `products.assetUrl` — the download route reconstructs the
 * full key from `storeId` + `filename`.
 */
export async function createAssetUploadUrl(
    subdomain: string,
    originalFilename: string,
    fileSize: number,
): Promise<AssetUploadUrlResult> {
    const session = await auth();
    if (!session?.user?.id) {
        return { ok: false, error: 'You must be signed in.' };
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_SIZE_BYTES) {
        return { ok: false, error: 'File must be between 1 byte and 500 MB.' };
    }

    const ext = originalFilename.split('.').pop()?.toLowerCase() ?? '';
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
        return {
            ok: false,
            error:
                'Unsupported file type. Use a common archive, document, media, or design format.',
        };
    }

    const [store] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(
            and(
                eq(stores.subdomain, subdomain),
                eq(stores.userId, session.user.id),
                isNull(stores.deletedAt),
            ),
        )
        .limit(1);

    if (!store) {
        return { ok: false, error: 'Store not found.' };
    }

    // Preserve a short readable stem so the seller's R2 bucket stays
    // browsable. The random UUID prefix guarantees uniqueness and forces
    // CDN caches to invalidate on re-upload.
    const rawStem = originalFilename.replace(/\.[^./\\]+$/, '');
    const safeStem =
        rawStem
            .replace(/[^A-Za-z0-9._-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80) || 'asset';

    const filename = `${randomUUID()}-${safeStem}.${ext}`;
    const key = `stores/${store.id}/assets/${filename}`;

    try {
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
        });

        // 5-minute window: enough for a slow-starting upload, short
        // enough that a leaked URL can't be exploited later.
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

        return { ok: true, uploadUrl, filename };
    } catch (err) {
        console.error('[createAssetUploadUrl]', err);
        return { ok: false, error: 'Could not prepare upload. Please try again.' };
    }
}