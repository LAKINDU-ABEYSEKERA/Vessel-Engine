'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

import { CreateStoreForm } from './create-store-form';

export function AddStoreToggle({ initialOpen = false }: { initialOpen?: boolean }) {
    const [open, setOpen] = useState(initialOpen);

    // If the URL changes to ?new=1 while we're already mounted (e.g. user
    // clicks "Add store" in the sidebar while on /app), reflect it.
    useEffect(() => {
        if (initialOpen) setOpen(true);
    }, [initialOpen]);

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
                onClick={() => setOpen(false)}
                aria-label="Close form"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
            >
                <X className="h-4 w-4" />
            </button>
            <CreateStoreForm />
        </div>
    );
}