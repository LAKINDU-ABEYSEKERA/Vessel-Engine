'use client';

import { useState } from 'react';
import { Store, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

import { createStore, type CreateStoreResult } from '@/actions/store';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type Field = 'name' | 'subdomain' | undefined;

interface FieldErrors {
    name?: string;
    subdomain?: string;
    general?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function CreateStoreForm() {
    const [pending, setPending] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [subdomain, setSubdomain] = useState('');

    function clearFieldError(field: Field) {
        if (!field) {
            setErrors({});
            return;
        }
        setErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }

    async function handleSubmit(formData: FormData) {
        setPending(true);
        setErrors({});

        let res: CreateStoreResult;
        try {
            res = await createStore(formData);
        } catch (err) {
            console.error('[CreateStoreForm] action threw:', err);
            setErrors({ general: 'Something went wrong. Please try again.' });
            setPending(false);
            return;
        }

        if (res.ok) {
            // Success — the Server Action called revalidatePath('/app'),
            // so the parent page will re-render in "active dashboard" mode
            // and unmount this form. No client-side navigation needed.
            return;
        }

        // Map the error to the right slot based on the returned `field`.
        if (res.field === 'name') {
            setErrors({ name: res.error });
        } else if (res.field === 'subdomain') {
            setErrors({ subdomain: res.error });
        } else {
            setErrors({ general: res.error });
        }
        setPending(false);
    }

    const subdomainTooShort = subdomain.length > 0 && subdomain.length < 3;

    return (
        <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6">
                <Store className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
            </div>

            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Name your storefront
            </h2>
            <p className="text-sm text-zinc-500 mb-8">
                This will be the public name of your store and dictate your free
                vesselengine.com URL.
            </p>

            <form action={handleSubmit} className="space-y-5">
                {/* ---------------------------------------------------------- */}
                {/* Store name                                                  */}
                {/* ---------------------------------------------------------- */}
                <div className="space-y-1.5">
                    <label
                        htmlFor="name"
                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        Store Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        maxLength={60}
                        placeholder="e.g. Neon Wave Records"
                        onChange={() => clearFieldError('name')}
                        aria-invalid={errors.name ? 'true' : 'false'}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                        className={
                            'w-full h-11 px-3.5 rounded-xl border bg-transparent text-sm text-zinc-900 dark:text-white ' +
                            'focus:outline-none focus:ring-2 transition-shadow ' +
                            (errors.name
                                ? 'border-red-400 dark:border-red-800 focus:ring-red-500 dark:focus:ring-red-500'
                                : 'border-zinc-300 dark:border-zinc-700 focus:ring-zinc-900 dark:focus:ring-white')
                        }
                    />
                    {errors.name && (
                        <p
                            id="name-error"
                            role="alert"
                            className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1"
                        >
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {errors.name}
                        </p>
                    )}
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Subdomain                                                   */}
                {/* ---------------------------------------------------------- */}
                <div className="space-y-1.5">
                    <label
                        htmlFor="subdomain"
                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        Store URL
                    </label>
                    <div
                        className={
                            'flex items-center rounded-xl border bg-transparent overflow-hidden ' +
                            'focus-within:ring-2 transition-shadow ' +
                            (errors.subdomain
                                ? 'border-red-400 dark:border-red-800 focus-within:ring-red-500 dark:focus-within:ring-red-500'
                                : 'border-zinc-300 dark:border-zinc-700 focus-within:ring-zinc-900 dark:focus-within:ring-white')
                        }
                    >
                        <input
                            type="text"
                            id="subdomain"
                            name="subdomain"
                            required
                            placeholder="neonwave"
                            value={subdomain}
                            onChange={(e) => {
                                const cleaned = e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9-]/g, '')
                                    .replace(/-{2,}/g, '-');
                                setSubdomain(cleaned);
                                clearFieldError('subdomain');
                            }}
                            aria-invalid={errors.subdomain ? 'true' : 'false'}
                            aria-describedby={
                                errors.subdomain
                                    ? 'subdomain-error'
                                    : subdomainTooShort
                                        ? 'subdomain-hint'
                                        : undefined
                            }
                            className="flex-1 h-11 px-3.5 bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none"
                        />
                        <span className="px-3.5 text-sm text-zinc-500 bg-zinc-50 dark:bg-zinc-900 h-11 flex items-center border-l border-zinc-300 dark:border-zinc-700">
                            .vesselengine.com
                        </span>
                    </div>

                    {errors.subdomain && (
                        <p
                            id="subdomain-error"
                            role="alert"
                            className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1"
                        >
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {errors.subdomain}
                        </p>
                    )}

                    {!errors.subdomain && subdomainTooShort && (
                        <p
                            id="subdomain-hint"
                            className="text-[11px] text-amber-600 dark:text-amber-500 mt-1"
                        >
                            At least 3 characters.
                        </p>
                    )}

                    {!errors.subdomain && subdomain.length >= 3 && (
                        <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                            Preview: http://{subdomain}.localhost:3000
                        </p>
                    )}
                </div>

                {/* ---------------------------------------------------------- */}
                {/* General error banner                                        */}
                {/* ---------------------------------------------------------- */}
                {errors.general && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900"
                    >
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errors.general}</span>
                    </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* Submit                                                      */}
                {/* ---------------------------------------------------------- */}
                <button
                    type="submit"
                    disabled={pending || subdomain.length < 3}
                    className="group flex w-full h-11 mt-4 items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold transition hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {pending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating…
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