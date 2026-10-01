import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';

import { AccountForm } from '../../(dashboard)/account/account-form';

export default async function CustomerAccountPage() {
    const session = await auth();
    if (!session?.user?.id) notFound();

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

    if (!user) notFound();

    const initial = (user.name ?? user.email ?? '?').slice(0, 1).toUpperCase();

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl p-8">
                <Link
                    href="/app/customer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-6"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to dashboard
                </Link>

                <header className="mb-8">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                        Account settings
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Manage your profile picture and personal details.
                    </p>
                </header>

                <AccountForm
                    initialName={user.name ?? ''}
                    email={user.email ?? ''}
                    avatarUrl={user.avatarUrl}
                    fallbackAvatarUrl={user.image}
                    initial={initial}
                    hasPassword={Boolean(user.passwordHash)}
                />
            </div>
        </div>
    );
}