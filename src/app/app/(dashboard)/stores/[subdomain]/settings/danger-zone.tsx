'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { deleteStore } from '@/actions/store';

interface Props {
    subdomain: string;
    storeName: string;
}

export function DangerZone({ subdomain, storeName }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [pending, setPending] = useState(false);

    const confirmed = confirmText.trim() === subdomain;

    async function handleDelete() {
        if (!confirmed) return;

        setPending(true);
        try {
            const res = await deleteStore(subdomain, confirmText);

            if (res.ok) {
                toast.success('Store deleted.', {
                    description: `${storeName} and everything inside it has been removed.`,
                });
                router.push('/app');
                router.refresh();
                return;
            }

            toast.error(res.error);
            setPending(false);
        } catch (err) {
            console.error('[DangerZone]', err);
            toast.error('Something went wrong. Please try again.');
            setPending(false);
        }
    }

    return (
        <section className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/10 p-6">
            <div className="flex items-start gap-3 mb-4">
                <div className="h-9 w-9 rounded-lg bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                        Danger zone
                    </h3>
                    <p className="text-xs text-red-700/80 dark:text-red-300/70 mt-0.5">
                        Once you delete a store, there is no going back.
                    </p>
                </div>
            </div>

            {!open ? (
                <div className="flex items-center justify-between gap-4 pt-2">
                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                        Delete this store and all of its data
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-900/60 bg-white dark:bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete store
                    </button>
                </div>
            ) : (
                <div className="space-y-4 pt-2">
                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                        <p className="font-medium mb-1">
                            This will permanently delete:
                        </p>
                        <ul className="list-disc list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5 ml-1">
                            <li>The storefront at <code className="font-mono">{subdomain}.vesselengine.com</code></li>
                            <li>All products and their images</li>
                            <li>All orders and order history</li>
                            <li>All digital asset references</li>
                        </ul>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-red-900 dark:text-red-300">
                            Type{' '}
                            <code className="font-mono bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded">
                                {subdomain}
                            </code>{' '}
                            to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={subdomain}
                            autoComplete="off"
                            className="w-full h-11 px-3.5 rounded-xl border border-red-300 dark:border-red-900/60 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow font-mono"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                setConfirmText('');
                            }}
                            disabled={pending}
                            className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={!confirmed || pending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {pending ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete this store
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}