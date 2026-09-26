import {
    Book,
    Box,
    Camera,
    Cpu,
    Download,
    Home,
    Package,
    Palette,
    Shirt,
    Sparkles,
    Utensils,
    type LucideIcon,
} from 'lucide-react';

/**
 * The list of category types available in the UI.
 *
 * Type is a *visual label only*. It determines the icon and accent color
 * shown in the dashboard. It does NOT change which fields a product has.
 * That keeps the schema simple and avoids polymorphic madness.
 */
export const CATEGORY_TYPES = [
    'clothing',
    'electronics',
    'digital',
    'home',
    'beauty',
    'books',
    'art',
    'food',
    'photography',
    'other',
] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number];

interface TypeMeta {
    label: string;
    icon: LucideIcon;
    /** Tailwind text color class (used on icon) */
    color: string;
    /** Tailwind background class (used on icon circle) */
    bg: string;
}

export const CATEGORY_TYPE_META: Record<CategoryType, TypeMeta> = {
    clothing: { label: 'Clothing', icon: Shirt, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    electronics: { label: 'Electronics', icon: Cpu, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    digital: { label: 'Digital', icon: Download, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    home: { label: 'Home', icon: Home, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    beauty: { label: 'Beauty', icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    books: { label: 'Books', icon: Book, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    art: { label: 'Art', icon: Palette, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
    food: { label: 'Food', icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    photography: { label: 'Photography', icon: Camera, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    other: { label: 'Other', icon: Box, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
};

export function getCategoryMeta(type: string): TypeMeta {
    if (type in CATEGORY_TYPE_META) {
        return CATEGORY_TYPE_META[type as CategoryType];
    }
    return CATEGORY_TYPE_META.other;
}

export function isValidCategoryType(type: string): type is CategoryType {
    return CATEGORY_TYPES.includes(type as CategoryType);
}