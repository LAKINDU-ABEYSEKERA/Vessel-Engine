'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { createCategory, updateCategory } from '@/actions/category';
import { CATEGORY_TYPES, CATEGORY_TYPE_META } from '@/lib/categories';
import { cx } from '@/lib/storefront';

export interface CategoryFormInitial {
    id: string;
    name: string;
    slug: string;
    type: string;
}

interface Props {
    subdomain: string;
    initial?: CategoryFormInitial;
}

interface FieldErrors {
    name?: string;
    slug?: string;
    type?: string;
    general?: string;
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function CategoryForm({ subdomain, initial }: Props) {
    const router = useRouter();
    const isEdit = Boolean(initial?.id);

    const [pending, setPending] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    const [name, setName] = useState(initial?.name ?? '');
    const [slug, setSlug] = useState(initial?.slug ?? '');
    const [slugManual, setSlugManual] = useState(Boolean(initial?.slug));
    const [type, setType] = useState(initial?.type ?? 'other');

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
            const res = isEdit
                ? await updateCategory(subdomain, initial!.id, formData)
                : await createCategory(subdomain, formData);

            if (res.ok) {
                toast.success(isEdit ? 'Section updated.' : 'Section created.');
                router.push(`/app/stores/${subdomain}/sections`);
                router.refresh();
                return;
            }

            if (res.field === 'name') setErrors({ name: res.error });
            else if (res.field === 'slug') setErrors({ slug: res.error });
            else if (res.field === 'type') setErrors({ type: res.error });
            else setErrors({ general: res.error });
            setPending(false);
        } catch (err) {
            console.error('[CategoryForm]', err);
            setErrors({ general: 'Something went wrong. Please try again.' });
            setPending(false);
        }
    }

    const previewSlug = useMemo(() => slug || slugify(name) || 'your-section', [slug, name]);

    return (
        <div className="flex-1 overflow-y-auto">
            <form action={handleSubmit} className="mx-auto max-w-3xl p-8">
                <Link
                    href={`/app/stores/${subdomain}/sections`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-6"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sections
                </Link>

                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-2">
                    {isEdit ? 'Edit section' : 'New section'}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
                    Sections group products for your storefront navigation.
                </p>

                {errors.general && (
                    <div className="flex items-start gap-2 p-3 mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errors.general}</span>
                    </div>
                )}

                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Name <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={name}
                            onChange={(e) => {
                                const value = e.target.value;
                                setName(value);
                                if (!slugManual) setSlug(slugify(value));
                                clearError('name');
                            }}
                            placeholder="Winter Wear"
                            maxLength={40}
                            required
                            className={cx(
                                'w-full h-11 px-3.5 rounded-xl border bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-shadow',
                                errors.name
                                    ? 'border-red-400 dark:border-red-800 focus:ring-red-500'
                                    : 'border-zinc-300 dark:border-zinc-700 focus:ring-zinc-900 dark:focus:ring-white'
                            )}
                        />
                        {errors.name ? (
                            <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {errors.name}
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Slug
                        </label>
                        <input
                            type="text"
                            name="slug"
                            value={slug}
                            onChange={(e) => {
                                setSlug(e.target.value);
                                setSlugManual(true);
                                clearError('slug');
                            }}
                            placeholder="winter-wear"
                            className={cx(
                                'w-full h-11 px-3.5 rounded-xl border bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-shadow',
                                errors.slug
                                    ? 'border-red-400 dark:border-red-800 focus:ring-red-500'
                                    : 'border-zinc-300 dark:border-zinc-700 focus:ring-zinc-900 dark:focus:ring-white'
                            )}
                        />
                        {errors.slug ? (
                            <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {errors.slug}
                            </p>
                        ) : (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                URL: /?section={previewSlug}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Type
                        </label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            A visual label that picks an icon. Doesn&apos;t affect product fields.
                        </p>
                        <input type="hidden" name="type" value={type} />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {CATEGORY_TYPES.map((t) => {
                                const meta = CATEGORY_TYPE_META[t];
                                const Icon = meta.icon;
                                const selected = type === t;
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                            setType(t);
                                            clearError('type');
                                        }}
                                        className={cx(
                                            'flex items-center gap-2 rounded-xl border-2 p-3 text-left transition',
                                            selected
                                                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900'
                                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                        )}
                                    >
                                        <span
                                            className={cx(
                                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                                meta.bg
                                            )}
                                        >
                                            <Icon className={cx('h-4 w-4', meta.color)} />
                                        </span>
                                        <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                            {meta.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.type ? (
                            <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {errors.type}
                            </p>
                        ) : null}
                    </div>
                </section>

                <div className="flex items-center justify-end gap-3 mt-8">
                    <Link
                        href={`/app/stores/${subdomain}/sections`}
                        className="rounded-xl px-5 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={pending}
                        className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {pending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {isEdit ? 'Saving…' : 'Creating…'}
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                {isEdit ? 'Save changes' : 'Create section'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}