import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { auth } from '@/auth';
import { db } from '@/db';
import { stores } from '@/db/schema';

import { StoreSettingsForm } from './store-settings-form';
import { DangerZone } from './danger-zone';

export default async function StoreSettingsPage({
                                                    params,
                                                }: {
    params: Promise<{ subdomain: string }>;
}) {
    const { subdomain } = await params;
    const session = await auth();
    if (!session?.user?.id) notFound();

    const [store] = await db
        .select()
        .from(stores)
        .where(
            and(
                eq(stores.subdomain, subdomain),
                eq(stores.userId, session.user.id),
                isNull(stores.deletedAt)
            )
        )
        .limit(1);

    if (!store) notFound();

    return (
        <div className="p-8 max-w-3xl">
            <header className="mb-8">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Settings
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Manage this storefront's identity and lifecycle.
                </p>
            </header>

            <div className="space-y-8">
                <StoreSettingsForm
                    subdomain={store.subdomain}
                    initialName={store.name}
                    initialSubdomain={store.subdomain}
                />

                <DangerZone
                    subdomain={store.subdomain}
                    storeName={store.name}
                />
            </div>
        </div>
    );
}