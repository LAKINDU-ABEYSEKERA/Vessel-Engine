'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { resetPasswordAction } from '@/actions/auth';

export function ResetPasswordForm({ token }: { token: string }) {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (redirectTimer.current) clearTimeout(redirectTimer.current);
        };
    }, []);

    async function handleSubmit(formData: FormData) {
        setPending(true);
        setError(null);

        const res = await resetPasswordAction(formData);
        if (!res.ok) {
            setError(res.error);
            setPending(false);
            return;
        }

        setDone(true);
        setPending(false);
        redirectTimer.current = setTimeout(() => {
            router.push('/app/login');
        }, 2200);
    }

    if (done) {
        return (
            <div className="w-full rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-left">
                        <p className="text-sm font-medium text-emerald-200">
                            Password updated
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-emerald-200/70">
                            Redirecting you to sign in…
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form action={handleSubmit} className="w-full space-y-3 text-left">
            <input type="hidden" name="token" value={token} />

            <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-zinc-400">
                    New password
                </label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    onChange={() => setError(null)}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/70 focus:border-zinc-700 transition"
                />
                <p className="text-[11px] text-zinc-600">
                    At least 8 characters, with a letter and a number.
                </p>
            </div>

            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-2 p-3 text-xs text-red-400 bg-red-950/40 rounded-lg border border-red-900"
                >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
                {pending ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating…
                    </>
                ) : (
                    'Update password'
                )}
            </button>
        </form>
    );
}