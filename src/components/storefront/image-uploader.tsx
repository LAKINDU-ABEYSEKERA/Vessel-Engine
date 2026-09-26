'use client';

import { useRef, useState } from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';

import { createProductImageUploadUrl } from '@/actions/upload';

interface ImageUploaderProps {
    subdomain: string;
    value: string | null;
    onChange: (url: string | null) => void;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_SIZE = 5 * 1024 * 1024;

export function ImageUploader({ subdomain, value, onChange }: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

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
            const res = await createProductImageUploadUrl(
                subdomain,
                file.type,
                file.size
            );

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

            onChange(res.publicUrl);
            toast.success('Image uploaded.');
        } catch (err) {
            console.error('[ImageUploader]', err);
            toast.error('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
        e.target.value = '';
    }

    return (
        <div className="space-y-3">
            {value ? (
                <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt="Product preview"
                        className="w-full max-w-sm aspect-[4/3] object-cover rounded-xl border border-zinc-200 dark:border-zinc-800"
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={uploading}
                            className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Replace
                        </button>
                        <span className="text-zinc-300 dark:text-zinc-700">·</span>
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            disabled={uploading}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            <X className="h-3 w-3" />
                            Remove
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="flex flex-col items-center justify-center w-full max-w-sm h-40 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 transition hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900/70 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-6 w-6 text-zinc-400 animate-spin mb-2" />
                            <span className="text-sm text-zinc-500">Uploading…</span>
                        </>
                    ) : (
                        <>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 mb-2">
                                <UploadCloud className="h-5 w-5 text-zinc-500" />
                            </div>
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Click to upload
                            </span>
                            <span className="text-xs text-zinc-500 mt-0.5">
                                JPEG, PNG, or WebP · max 5 MB
                            </span>
                        </>
                    )}
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                onChange={handleInputChange}
                className="hidden"
            />

            <input type="hidden" name="imageUrl" value={value ?? ''} />
        </div>
    );
}