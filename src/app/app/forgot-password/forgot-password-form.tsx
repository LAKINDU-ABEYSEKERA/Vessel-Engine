'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { forgotPasswordAction } from '@/actions/auth';

export function ForgotPasswordForm() {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    async function handleSubmit(formData: FormData) {
        setPending(true);
        setError(null);

        const res = await forgotPasswordAction(formData);
        if (!res.ok) {
            setError(res.error);
            setPending(false);
            return;
        }
        setSent(true);
        setPending(false);
    }

    if (sent) {
        return (
            <div className="w-full rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-left">
                        <p className="text-sm font-medium text-emerald-200">
                            Check your email
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-emerald-200/70">
                            If an account exists with that email, we sent a
                            reset link. The link is valid for 1 hour.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form action={handleSubmit} className="w-full space-y-3 text-left">
            <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium text-zinc-400">
                    Email
                </label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    onChange={() => setError(null)}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/70 focus:border-zinc-700 transition"
                />
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
                        Sending…
                    </>
                ) : (
                    'Send reset link'
                )}
            </button>
        </form>
    );
}