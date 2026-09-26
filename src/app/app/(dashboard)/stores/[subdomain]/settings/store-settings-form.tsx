'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { updateStore } from '@/actions/store';

interface Props {
    subdomain: string;
    initialName: string;
    initialSubdomain: string;
}

interface FieldErrors {
    name?: string;
    subdomain?: string;
    general?: string;
}

export function StoreSettingsForm({
                                      subdomain,
                                      initialName,
                                      initialSubdomain,
                                  }: Props) {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    const [name, setName] = useState(initialName);
    const [newSubdomain, setNewSubdomain] = useState(initialSubdomain);

    const subdomainChanged = newSubdomain !== initialSubdomain;

    function clearError(field: keyof FieldErrors) {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }

    async function handleSubmit(formData: FormData) {
        setPending(true);
        setErrors({});

        try {
            const res = await updateStore(subdomain, formData);

            if (res.ok) {
                toast.success('Store updated.', {
                    description: subdomainChanged
                        ? `New URL: ${res.subdomain}.vesselengine.com`
                        : 'Changes saved.',
                });

                if (subdomainChanged) {
                    // Navigate to the new URL so the user lands on a valid page.
                    router.push(`/app/stores/${res.subdomain}/settings`);
                }
                router.refresh();
                setPending(false);
                return;
            }

            if (res.field === 'name') setErrors({ name: res.error });
            else if (res.field === 'subdomain') setErrors({ subdomain: res.error });
            else setErrors({ general: res.error });
            setPending(false);
        } catch (err) {
            console.error('[StoreSettingsForm]', err);
            setErrors({ general: 'Something went wrong. Please try again.' });
            setPending(false);
        }
    }

    return (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-6">
                Store details
            </h3>

            <form action={handleSubmit} className="space-y-5">
                {errors.general && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900"
                    >
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errors.general}</span>
                    </div>
                )}

                {/* Store name */}
                <div className="space-y-1.5">
                    <label
                        htmlFor="name"
                        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        Store name
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            clearError('name');
                        }}
                        maxLength={60}
                        required
                        className={
                            'w-full h-11 px-3.5 rounded-xl border bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 transition-shadow ' +
                            (errors.name
                                ? 'border-red-400 dark:border-red-800 focus:ring-red-500'
                                : 'border-zinc-300 dark:border-zinc-700 focus:ring-zinc-900 dark:focus:ring-white')
                        }
                    />
                    {errors.name ? (
                        <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {errors.name}
                        </p>
                    ) : (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            The display name shown to customers.
                        </p>
                    )}
                </div>

                {/* Subdomain */}
                <div className="space-y-1.5">
                    <label
                        htmlFor="subdomain"
                        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        Subdomain
                    </label>
                    <div
                        className={
                            'flex items-center rounded-xl border bg-transparent overflow-hidden focus-within:ring-2 transition-shadow ' +
                            (errors.subdomain
                                ? 'border-red-400 dark:border-red-800 focus-within:ring-red-500'
                                : 'border-zinc-300 dark:border-zinc-700 focus-within:ring-zinc-900 dark:focus-within:ring-white')
                        }
                    >
                        <input
                            type="text"
                            id="subdomain"
                            name="subdomain"
                            value={newSubdomain}
                            onChange={(e) => {
                                const cleaned = e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9-]/g, '')
                                    .replace(/-{2,}/g, '-');
                                setNewSubdomain(cleaned);
                                clearError('subdomain');
                            }}
                            required
                            className="flex-1 h-11 px-3.5 bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none"
                        />
                        <span className="px-3.5 text-sm text-zinc-500 bg-zinc-50 dark:bg-zinc-900 h-11 flex items-center border-l border-zinc-300 dark:border-zinc-700">
                            .vesselengine.com
                        </span>
                    </div>

                    {errors.subdomain ? (
                        <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {errors.subdomain}
                        </p>
                    ) : subdomainChanged ? (
                        <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <div className="text-xs text-amber-700 dark:text-amber-300">
                                <strong>This changes your storefront URL.</strong>{' '}
                                Links you've shared will break. Your old
                                subdomain <code className="font-mono">{initialSubdomain}</code>{' '}
                                becomes available for others to claim.
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Changing this will break any previously shared links.
                        </p>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={pending || (name === initialName && !subdomainChanged)}
                        className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {pending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </section>
    );
}