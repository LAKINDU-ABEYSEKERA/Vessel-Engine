'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
    createAvatarUploadUrl,
    updateAvatarAction,
} from '@/actions/avatar';

const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_SIZE = 5 * 1024 * 1024;

interface AvatarUploaderProps {
    /** Currently saved avatar URL (null = none). */
    value: string | null;
    /** OAuth avatar URL — used as fallback preview when value is null. */
    fallbackUrl: string | null;
    /** First letter shown when neither value nor fallbackUrl exists. */
    initial: string;
}

export function AvatarUploader({ value, fallbackUrl, initial }: AvatarUploaderProps) {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const previewUrl = value ?? fallbackUrl;

    async function handleFile(file: File) {
        if (!ACCEPTED.split(',').includes(file.type)) {
            toast.error('Only JPEG, PNG, and WebP images are allowed.');
            return;
        }
        if (file.size > MAX_SIZE) {
            toast.error('Image must be under 5 MB.');
            return;
        }

        setUploading(true);
        try {
            const res = await createAvatarUploadUrl(file.type, file.size);
            if (!res.ok) {
                toast.error(res.error);
                return;
            }

            const uploadRes = await fetch(res.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });
            if (!uploadRes.ok) {
                throw new Error(`Upload failed with status ${uploadRes.status}`);
            }

            const save = await updateAvatarAction(res.publicUrl);
            if (!save.ok) {
                toast.error(save.error);
                return;
            }

            toast.success('Avatar updated.');
            router.refresh();
        } catch (err) {
            console.error('[AvatarUploader]', err);
            toast.error('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    }

    async function handleRemove() {
        if (!value) return;
        setRemoving(true);
        try {
            const res = await updateAvatarAction(null);
            if (!res.ok) {
                toast.error(res.error);
                return;
            }
            toast.success('Avatar removed.');
            router.refresh();
        } finally {
            setRemoving(false);
        }
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
        e.target.value = '';
    }

    const busy = uploading || removing;

    return (
        <div className="flex items-center gap-6">
            <div className="relative">
                {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={previewUrl}
                        alt="Avatar preview"
                        className="h-20 w-20 rounded-full object-cover bg-zinc-100 dark:bg-zinc-900 ring-2 ring-zinc-200 dark:ring-zinc-800"
                    />
                ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-2xl font-semibold text-zinc-600 dark:text-zinc-300 ring-2 ring-zinc-200 dark:ring-zinc-800">
                        {initial}
                    </div>
                )}

                {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Camera className="h-3.5 w-3.5" />
                    {value ? 'Replace' : 'Upload'}
                </button>

                {value && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg border border-transparent px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                    </button>
                )}

                <p className="text-[11px] text-zinc-500 dark:text-zinc-500 max-w-[24ch]">
                    JPEG, PNG, or WebP · max 5 MB
                </p>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                onChange={handleInputChange}
                className="hidden"
            />
        </div>
    );
}