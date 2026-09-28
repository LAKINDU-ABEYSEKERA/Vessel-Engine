'use client';

import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

import { signUpAction } from '@/actions/auth';

interface FieldErrors {
    name?: string;
    email?: string;
    password?: string;
    general?: string;
}

export function SignupForm() {
    const [pending, setPending] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    async function handleSubmit(formData: FormData) {
        setPending(true);
        setErrors({});

        try {
            const res = await signUpAction(formData);
            if (!res.ok) {
                const slot = res.field ?? 'general';
                setErrors({ [slot]: res.error });
                setPending(false);
            }
            // On success signUpAction redirects (throws NEXT_REDIRECT).
        } catch (err) {
            console.error('[SignupForm]', err);
            setErrors({ general: 'Something went wrong. Please try again.' });
            setPending(false);
        }
    }

    function clear(field: keyof FieldErrors) {
        setErrors((p) => (p[field] ? { ...p, [field]: undefined } : p));
    }

    return (
        <form action={handleSubmit} className="w-full space-y-3 text-left">
            <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs font-medium text-zinc-400">
                    Name
                </label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="Jane Doe"
                    maxLength={80}
                    onChange={() => clear('name')}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/70 focus:border-zinc-700 transition"
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>

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
                    onChange={() => clear('email')}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/70 focus:border-zinc-700 transition"
                />
                {errors.email && <FieldError>{errors.email}</FieldError>}
            </div>

            <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-zinc-400">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    onChange={() => clear('password')}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/70 focus:border-zinc-700 transition"
                />
                {errors.password ? (
                    <FieldError>{errors.password}</FieldError>
                ) : (
                    <p className="text-[11px] text-zinc-600">
                        At least 8 characters, with a letter and a number.
                    </p>
                )}
            </div>

            {errors.general && (
                <div
                    role="alert"
                    className="flex items-start gap-2 p-3 text-xs text-red-400 bg-red-950/40 rounded-lg border border-red-900"
                >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{errors.general}</span>
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
                        Creating account…
                    </>
                ) : (
                    'Create account'
                )}
            </button>

            <p className="text-[11px] text-zinc-600 text-center pt-2">
                By creating an account you agree to our Terms of Service and Privacy Policy.
            </p>
        </form>
    );
}

function FieldError({ children }: { children: React.ReactNode }) {
    return (
        <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {children}
        </p>
    );
}