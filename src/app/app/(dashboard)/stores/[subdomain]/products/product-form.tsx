'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    AlertCircle,
    ArrowLeft,
    Download,
    Loader2,
    Package,
    Save,
} from 'lucide-react';
import { toast } from 'sonner';

import { ImageUploader } from '@/components/storefront/image-uploader';
import {
    createProduct,
    updateProduct,
    type ProductField,
} from '@/actions/product';
import type { StoreCategory } from '@/lib/storefront';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface ProductFormInitial {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    priceInCents: number;
    inventory: number;
    isDigital: boolean;
    assetUrl: string | null;
    imageUrl: string | null;
    categoryIds?: string[];
}

interface ProductFormProps {
    subdomain: string;
    initial?: ProductFormInitial;
    categories: StoreCategory[];
}

interface FieldErrors {
    name?: string;
    slug?: string;
    description?: string;
    priceInCents?: string;
    inventory?: string;
    assetUrl?: string;
    imageUrl?: string;
    general?: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
}

function centsToInput(cents: number): string {
    return (cents / 100).toFixed(2);
}

function mapField(field: ProductField | undefined): keyof FieldErrors {
    if (!field || field === 'isDigital') return 'general';
    return field;
}

function inputClass(error?: string): string {
    return (
        'w-full h-11 px-3.5 rounded-xl border bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-shadow ' +
        (error
            ? 'border-red-400 dark:border-red-800 focus:ring-red-500 dark:focus:ring-red-500'
            : 'border-zinc-300 dark:border-zinc-700 focus:ring-zinc-900 dark:focus:ring-white')
    );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function ProductForm({ subdomain, initial, categories }: ProductFormProps) {
    const router = useRouter();
    const isEdit = Boolean(initial?.id);

    const [pending, setPending] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    // --- Form state ---
    const [name, setName] = useState(initial?.name ?? '');
    const [slug, setSlug] = useState(initial?.slug ?? '');
    const [slugManual, setSlugManual] = useState(Boolean(initial?.slug));
    const [description, setDescription] = useState(initial?.description ?? '');
    const [price, setPrice] = useState(
        initial ? centsToInput(initial.priceInCents) : ''
    );
    const [isDigital, setIsDigital] = useState(initial?.isDigital ?? false);
    const [inventory, setInventory] = useState(
        initial?.inventory !== undefined ? String(initial.inventory) : '0'
    );
    const [assetUrl, setAssetUrl] = useState(initial?.assetUrl ?? '');
    const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
        initial?.categoryIds ?? []
    );

    function clearError(field: keyof FieldErrors) {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }

    function toggleCategory(id: string) {
        setSelectedCategoryIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    async function handleSubmit(formData: FormData) {
        setPending(true);
        setErrors({});

        try {
            const res = isEdit
                ? await updateProduct(subdomain, initial!.id, formData)
                : await createProduct(subdomain, formData);

            if (res.ok) {
                toast.success(isEdit ? 'Product updated.' : 'Product created.', {
                    description: name || 'Your product is live.',
                });
                router.push(`/app/stores/${subdomain}/products`);
                router.refresh();
                return;
            }

            const slot = mapField(res.field);
            setErrors({ [slot]: res.error } as FieldErrors);
            setPending(false);
        } catch (err) {
            console.error('[ProductForm]', err);
            setErrors({ general: 'Something went wrong. Please try again.' });
            setPending(false);
        }
    }

    const previewSlug = useMemo(
        () => slug || slugify(name) || 'your-product',
        [slug, name]
    );

    return (
        <div className="flex-1 overflow-y-auto">
            <form action={handleSubmit} className="mx-auto max-w-3xl p-8">
                <Link
                    href={`/app/stores/${subdomain}/products`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-6"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to products
                </Link>

                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-2">
                    {isEdit ? 'Edit product' : 'New product'}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
                    {isEdit
                        ? 'Update the details for this product.'
                        : 'Add a physical or digital product to your store.'}
                </p>

                {errors.general && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 p-3 mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900"
                    >
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errors.general}</span>
                    </div>
                )}

                <div className="space-y-6">
                    {/* ---------------------------------------------------- */}
                    {/* Basic info                                            */}
                    {/* ---------------------------------------------------- */}
                    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-5">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                            Basic info
                        </h2>

                        <Field label="Name" required error={errors.name}>
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
                                placeholder="Heavyweight Canvas Jacket"
                                maxLength={120}
                                required
                                className={inputClass(errors.name)}
                            />
                        </Field>

                        <Field
                            label="Slug"
                            hint={`URL: ${previewSlug}`}
                            error={errors.slug}
                        >
                            <input
                                type="text"
                                name="slug"
                                value={slug}
                                onChange={(e) => {
                                    setSlug(e.target.value);
                                    setSlugManual(true);
                                    clearError('slug');
                                }}
                                placeholder="heavyweight-canvas-jacket"
                                className={inputClass(errors.slug)}
                            />
                        </Field>

                        <Field label="Description" error={errors.description}>
                            <textarea
                                name="description"
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                    clearError('description');
                                }}
                                rows={3}
                                maxLength={4000}
                                placeholder="Rugged, weather-sealed heavyweight canvas jacket."
                                className={inputClass(errors.description) + ' resize-none py-3'}
                            />
                        </Field>
                    </section>

                    {/* ---------------------------------------------------- */}
                    {/* Type & pricing                                        */}
                    {/* ---------------------------------------------------- */}
                    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-5">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                            Type &amp; pricing
                        </h2>

                        <Field label="Product type">
                            <div className="grid grid-cols-2 gap-3">
                                <TypeCard
                                    selected={!isDigital}
                                    onClick={() => {
                                        setIsDigital(false);
                                        clearError('inventory');
                                    }}
                                    icon={<Package className="h-4 w-4" />}
                                    label="Physical"
                                    hint="Shipped to the customer"
                                />
                                <TypeCard
                                    selected={isDigital}
                                    onClick={() => {
                                        setIsDigital(true);
                                        clearError('assetUrl');
                                    }}
                                    icon={<Download className="h-4 w-4" />}
                                    label="Digital"
                                    hint="Delivered instantly"
                                />
                            </div>
                            <input
                                type="hidden"
                                name="isDigital"
                                value={isDigital ? 'true' : 'false'}
                            />
                        </Field>

                        <Field label="Price" required error={errors.priceInCents}>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                                    $
                                </span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    name="price"
                                    value={price}
                                    onChange={(e) => {
                                        setPrice(e.target.value);
                                        clearError('priceInCents');
                                    }}
                                    placeholder="145.00"
                                    required
                                    className={inputClass(errors.priceInCents) + ' pl-7'}
                                />
                            </div>
                        </Field>

                        {!isDigital && (
                            <Field label="Inventory" required error={errors.inventory}>
                                <input
                                    type="number"
                                    name="inventory"
                                    value={inventory}
                                    onChange={(e) => {
                                        setInventory(e.target.value);
                                        clearError('inventory');
                                    }}
                                    min={0}
                                    step={1}
                                    required
                                    className={inputClass(errors.inventory)}
                                />
                                <p className="text-xs text-zinc-500 mt-1">
                                    How many units are available to sell.
                                </p>
                            </Field>
                        )}

                        {isDigital && (
                            <Field
                                label="Asset URL"
                                required
                                hint="The download link the customer receives after purchase."
                                error={errors.assetUrl}
                            >
                                <input
                                    type="url"
                                    name="assetUrl"
                                    value={assetUrl}
                                    onChange={(e) => {
                                        setAssetUrl(e.target.value);
                                        clearError('assetUrl');
                                    }}
                                    placeholder="https://cdn.example.com/files/product.zip"
                                    required
                                    className={inputClass(errors.assetUrl)}
                                />
                            </Field>
                        )}
                    </section>

                    {/* ---------------------------------------------------- */}
                    {/* Sections                                              */}
                    {/* ---------------------------------------------------- */}
                    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                                Sections
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                Optional. A product can appear in multiple sections.
                            </p>
                        </div>

                        {categories.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                No sections exist yet. Create one from the Sections tab
                                to organize this product.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {categories.map((cat) => {
                                    const checked = selectedCategoryIds.includes(cat.id);
                                    return (
                                        <label
                                            key={cat.id}
                                            className={
                                                'flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition ' +
                                                (checked
                                                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900'
                                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700')
                                            }
                                        >
                                            <input
                                                type="checkbox"
                                                name="categoryIds"
                                                value={cat.id}
                                                checked={checked}
                                                onChange={() => toggleCategory(cat.id)}
                                                className="h-4 w-4 shrink-0 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-zinc-900 dark:focus:ring-white"
                                            />
                                            <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                                {cat.name}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* ---------------------------------------------------- */}
                    {/* Media                                                 */}
                    {/* ---------------------------------------------------- */}
                    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-5">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                            Media
                        </h2>

                        <Field
                            label="Product image"
                            hint="Shown on the storefront. Optional."
                            error={errors.imageUrl}
                        >
                            <ImageUploader
                                subdomain={subdomain}
                                value={imageUrl || null}
                                onChange={(url) => {
                                    setImageUrl(url ?? '');
                                    clearError('imageUrl');
                                }}
                            />
                        </Field>
                    </section>
                </div>

                <div className="flex items-center justify-end gap-3 mt-8">
                    <Link
                        href={`/app/stores/${subdomain}/products`}
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
                                {isEdit ? 'Save changes' : 'Create product'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                              */
/* -------------------------------------------------------------------------- */

function Field({
                   label,
                   hint,
                   required,
                   error,
                   children,
               }: {
    label: string;
    hint?: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {error ? (
                <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                </p>
            ) : hint ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{hint}</p>
            ) : null}
        </div>
    );
}

function TypeCard({
                      selected,
                      onClick,
                      icon,
                      label,
                      hint,
                  }: {
    selected: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    hint: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ' +
                (selected
                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900'
                    : 'border-zinc-200 dark:border-zinc-800 bg-transparent hover:border-zinc-300 dark:hover:border-zinc-700')
            }
        >
            <span
                className={
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' +
                    (selected
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500')
                }
            >
                {icon}
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-900 dark:text-white">
                    {label}
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {hint}
                </span>
            </span>
        </button>
    );
}