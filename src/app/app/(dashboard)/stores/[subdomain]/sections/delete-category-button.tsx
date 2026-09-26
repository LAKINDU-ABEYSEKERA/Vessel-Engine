'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { deleteCategory } from '@/actions/category';

export function DeleteCategoryButton({
                                         subdomain,
                                         categoryId,
                                         categoryName,
                                         productCount,
                                     }: {
    subdomain: string;
    categoryId: string;
    categoryName: string;
    productCount: number;
}) {
    const router = useRouter();
    const [pending, setPending] = useState(false);

    async function handleDelete() {
        const message =
            productCount > 0
                ? `Delete "${categoryName}"? The ${productCount} product(s) in this section will remain — they'll just no longer be grouped here.`
                : `Delete "${categoryName}"? This cannot be undone.`;

        if (!window.confirm(message)) return;

        setPending(true);
        const res = await deleteCategory(subdomain, categoryId);
        if (!res.ok) {
            toast.error(res.error);
            setPending(false);
            return;
        }
        toast.success('Section deleted.');
        router.refresh();
        setPending(false);
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            aria-label={`Delete ${categoryName}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 disabled:opacity-50 cursor-pointer"
        >
            {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
                <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete
        </button>
    );
}