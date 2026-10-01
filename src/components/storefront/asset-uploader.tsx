'use client';

import { useRef, useState } from 'react';
import { FileArchive, Loader2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';

import { createAssetUploadUrl } from '@/actions/asset-upload';

interface AssetUploaderProps {
    subdomain: string;
    /** Stored bare filename. `null` = no asset uploaded yet. */
    value: string | null;
    onChange: (filename: string | null) => void;
}

const MAX_SIZE = 500 * 1024 * 1024;

/** A broad `accept` — the server-side allowlist is the source of truth. */
const ACCEPT = [
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.pdf', '.epub', '.mobi', '.txt', '.md', '.csv',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.json', '.xml',
    '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
    '.mp4', '.mov', '.webm',
    '.psd', '.ai', '.fig', '.sketch', '.xd',
    '.png', '.jpg', '.jpeg', '.webp', '.gif',
].join(',');

export function AssetUploader({ subdomain, value, onChange }: AssetUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    async function handleFile(file: File) {
        if (file.size <= 0) {
            toast.error('File is empty.');
            return;
        }
        if (file.size > MAX_SIZE) {
            toast.error('File must be under 500 MB.');
            return;
        }

        setUploading(true);
        setProgress(0);

        try {
            const res = await createAssetUploadUrl(subdomain, file.name, file.size);
            if (!res.ok) {
                toast.error(res.error);
                return;
            }

            // XHR because fetch() can't report upload progress, and for
            // large course videos the seller needs a percentage readout.
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', res.uploadUrl, true);
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        setProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve();
                    else reject(new Error(`Upload failed with status ${xhr.status}`));
                };
                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(file);
            });

            onChange(res.filename);
            toast.success('File uploaded.', { description: file.name });
        } catch (err) {
            console.error('[AssetUploader]', err);
            toast.error('Upload failed. Please try again.');
        } finally {
            setUploading(false);
            setProgress(0);
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
                <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <FileArchive className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                            {value}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Stored on this store&apos;s private CDN
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={uploading}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            disabled={uploading}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50 cursor-pointer"
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
                    className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 transition hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900/70 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-6 w-6 text-zinc-400 animate-spin mb-2" />
                            <span className="text-sm text-zinc-500">
                                Uploading… {progress}%
                            </span>
                            <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                <div
                                    className="h-full bg-zinc-900 dark:bg-white transition-all duration-150"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 mb-2">
                                <UploadCloud className="h-5 w-5 text-zinc-500" />
                            </div>
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Upload delivery file
                            </span>
                            <span className="text-xs text-zinc-500 mt-0.5">
                                Archive · document · media · design · max 500 MB
                            </span>
                        </>
                    )}
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                onChange={handleInputChange}
                className="hidden"
            />

            {/* The parent <form> submits this value on save. */}
            <input type="hidden" name="assetUrl" value={value ?? ''} />
        </div>
    );
}