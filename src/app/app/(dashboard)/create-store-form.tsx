'use client';

import { useState } from 'react';
import { createStore } from '@/actions/store';
import { Store, Loader2, ArrowRight } from 'lucide-react';

export function CreateStoreForm() {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subdomain, setSubdomain] = useState('');

    async function handleSubmit(formData: FormData) {
        setPending(true);
        setError(null);

        const res = await createStore(formData);

        if (res.error) {
            setError(res.error);
            setPending(false);
        }
        // On success, the server action calls revalidatePath('/app'),
        // which will instantly re-render the page and swap this form for the active dashboard.
    }

    return (
        <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6">
                <Store className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
            </div>

            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Name your storefront
            </h2>
            <p className="text-sm text-zinc-500 mb-8">
                This will be the public name of your store and dictate your free vesselengine.com URL.
            </p>

            <form action={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Store Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        placeholder="e.g. Neon Wave Records"
                        className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-shadow"
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="subdomain" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Store URL
                    </label>
                    <div className="flex items-center rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent focus-within:ring-2 focus-within:ring-zinc-900 dark:focus-within:ring-white transition-shadow overflow-hidden">
                        <input
                            type="text"
                            id="subdomain"
                            name="subdomain"
                            required
                            placeholder="neonwave"
                            value={subdomain}
                            onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            className="flex-1 h-11 px-3.5 bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none"
                        />
                        <span className="px-3.5 text-sm text-zinc-500 bg-zinc-50 dark:bg-zinc-900 h-11 flex items-center border-l border-zinc-300 dark:border-zinc-700">
                            .vesselengine.com
                        </span>
                    </div>
                    {subdomain.length > 0 && (
                        <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                            Preview: http://{subdomain}.localhost:3000
                        </p>
                    )}
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={pending || subdomain.length < 3}
                    className="group flex w-full h-11 mt-4 items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold transition hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {pending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            Create Storefront
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}