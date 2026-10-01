'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

import { loginAction } from '@/actions/auth';

export function CredentialsForm() {
    const [state, formAction, pending] = useActionState(loginAction, null);

    return (
        <form action={formAction} className="w-full space-y-3 text-left">
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
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/70 focus:border-zinc-700 transition"
                />
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-medium text-zinc-400">
                        Password
                    </label>
                    <Link
                        href="/app/forgot-password"
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-300"
                    >
                        Forgot?
                    </Link>
                </div>
                <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/70 focus:border-zinc-700 transition"
                />
            </div>

            {state && !state.ok && (
                <div
                    role="alert"
                    className="flex items-start gap-2 p-3 text-xs text-red-400 bg-red-950/40 rounded-lg border border-red-900"
                >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{state.error}</span>
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
                        Signing in…
                    </>
                ) : (
                    'Sign in'
                )}
            </button>
        </form>
    );
}