import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';

import { cx, type StoreCategory } from '@/lib/storefront';
import { CATEGORY_TYPE_META } from '@/lib/categories';

interface Props {
    categories: StoreCategory[];
    activeSlug: string | null;
    totalProducts: number;
    /** Called from server component — URL base for chip links */
    basePath: string;
}

export function CategoryChips({ categories, activeSlug, totalProducts, basePath }: Props) {
    if (categories.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 mb-8">
            <Link
                href={basePath}
                className={cx(
                    'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                    !activeSlug
                        ? 'border-zinc-100 bg-zinc-100 text-zinc-900'
                        : 'border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100'
                )}
            >
                <LayoutGrid className="h-3.5 w-3.5" />
                All
                <span className="font-mono text-[11px] tabular-nums opacity-60">
                    {totalProducts}
                </span>
            </Link>

            {categories.map((cat) => {
                const meta = CATEGORY_TYPE_META[
                    cat.type as keyof typeof CATEGORY_TYPE_META
                    ] ?? CATEGORY_TYPE_META.other;
                const Icon = meta.icon;
                const isActive = activeSlug === cat.slug;

                return (
                    <Link
                        key={cat.id}
                        href={`${basePath}?section=${cat.slug}`}
                        className={cx(
                            'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                            isActive
                                ? 'border-zinc-100 bg-zinc-100 text-zinc-900'
                                : 'border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100'
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {cat.name}
                    </Link>
                );
            })}
        </div>
    );
}