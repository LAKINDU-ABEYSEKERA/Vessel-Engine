'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

import { CreateStoreForm } from './create-store-form';

/**
 * The parent is responsible for resetting this component when
 * `initialOpen` changes — see `page.tsx`, which passes a changing
 * `key` based on the `?new=1` query param.
 *
 * `CreateStoreForm` calls `onSuccess` after a successful create so we
 * close the form deterministically — no reliance on router timing or
 * RSC refetches. The URL is then rewritten to `/app` (dropping `?new=1`)
 * so the sidebar "Add store" link keeps working on repeat opens.
 */
export function AddStoreToggle({ initialOpen = false }: { initialOpen?: boolean }) {
    const router = useRouter();
    const [open, setOpen] = useState(initialOpen);

    function close() {
        setOpen(false);
        // Drop `?new=1` so clicking "Add store" in the sidebar again
        // produces a URL change and re-opens the form.
        router.replace('/app');
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-5 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
            >
                <Plus className="h-4 w-4" />
                Add another store
            </button>
        );
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={close}
                aria-label="Close form"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
            >
                <X className="h-4 w-4" />
            </button>
            <CreateStoreForm onSuccess={close} />
        </div>
    );
}