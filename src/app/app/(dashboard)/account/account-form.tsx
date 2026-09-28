'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { AvatarUploader } from '@/components/account/avatar-uploader';
import { updateProfileAction } from '@/actions/account';

interface AccountFormProps {
    initialName: string;
    email: string;
    avatarUrl: string | null;
    fallbackAvatarUrl: string | null;
    initial: string;
    hasPassword: boolean;
}

export function AccountForm({
                                initialName,
                                email,
                                avatarUrl,
                                fallbackAvatarUrl,
                                initial,
                                hasPassword,
                            }: AccountFormProps) {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [name, setName] = useState(initialName);

    async function handleSubmit(formData: FormData) {
        setPending(true);
        setNameError(null);
        setGeneralError(null);

        try {
            const res = await updateProfileAction(formData);
            if (res.ok) {
                toast.success('Profile updated.');
                router.refresh();
                setPending(false);
                return;
            }
            if (res.field === 'name') setNameError(res.error);
            else setGeneralError(res.error);
            setPending(false);
        } catch (err) {
            console.error('[AccountForm]', err);
            setGeneralError('Something went wrong. Please try again.');
            setPending(false);
        }
    }

    const nameChanged = name !== initialName;

    return (
        <div className="space-y-8">
            {/* -------------------------------------------------------- */}
            {/* Avatar                                                     */}
            {/* -------------------------------------------------------- */}
            <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
                    Profile picture
                </h2>
                <AvatarUploader
                    value={avatarUrl}
                    fallbackUrl={fallbackAvatarUrl}
                    initial={initial}
                />
            </section>

            {/* -------------------------------------------------------- */}
            {/* Profile details                                            */}
            {/* -------------------------------------------------------- */}
            <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-6">
                    Profile details
                </h2>

                <form action={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            Display name
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setNameError(null);
                            }}
                            maxLength={80}
                            required
                            className={
                                'w-full h-11 px-3.5 rounded-xl border bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 transition-shadow ' +
                                (nameError
                                    ? 'border-red-400 dark:border-red-800 focus:ring-red-500'
                                    : 'border-zinc-300 dark:border-zinc-700 focus:ring-zinc-900 dark:focus:ring-white')
                            }
                        />
                        {nameError && (
                            <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {nameError}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            readOnly
                            className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-sm text-zinc-500 dark:text-zinc-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Changing your email is not supported yet.
                        </p>
                    </div>

                    {generalError && (
                        <div
                            role="alert"
                            className="flex items-start gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-900"
                        >
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{generalError}</span>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={pending || !nameChanged}
                            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {pending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Password                                                   */}
            {/* -------------------------------------------------------- */}
            <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                    Password
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                    {hasPassword
                        ? 'You can change your password using the password reset flow.'
                        : 'Set a password to sign in with email as well as Google.'}
                </p>
                <Link
                    href="/app/forgot-password"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                    {hasPassword ? 'Change password' : 'Set a password'}
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </section>
        </div>
    );
}