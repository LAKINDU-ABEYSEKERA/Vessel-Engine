'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { AlertCircle, Loader2, ShoppingBag, Store } from 'lucide-react';

import { signUpAction } from '@/actions/auth';

type Role = 'customer' | 'seller';

export function SignupForm() {
    const [role, setRole] = useState<Role>('customer');
    const [state, formAction, pending] = useActionState(signUpAction, null);

    const fieldError = (field: 'name' | 'email' | 'password' | 'role') =>
        state && !state.ok && state.field === field ? state.error : null;

    const generalError =
        state && !state.ok && (!state.field || state.field === 'general')
            ? state.error
            : null;

    return (
        <form action={formAction} className="w-full space-y-4 text-left">
            {/* ---------------------------------------------------------- */}
            {/* Role picker                                                  */}
            {/* ---------------------------------------------------------- */}
            <input type="hidden" name="role" value={role} />

            <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-400">
                    I want to…
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <RoleCard
                        selected={role === 'customer'}
                        onClick={() => setRole('customer')}
                        icon={<ShoppingBag className="h-4 w-4" />}
                        title="Shop"
                        subtitle="Buy from creators"
                    />
                    <RoleCard
                        selected={role === 'seller'}
                        onClick={() => setRole('seller')}
                        icon={<Store className="h-4 w-4" />}
                        title="Sell"
                        subtitle="Open a storefront"
                    />
                </div>
                {fieldError('role') && (
                    <FieldError>{fieldError('role')}</FieldError>
                )}
            </div>

            {/* ---------------------------------------------------------- */}
            {/* Name                                                         */}
            {/* ---------------------------------------------------------- */}
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
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/70 focus:border-zinc-700 transition"
                />
                {fieldError('name') && <FieldError>{fieldError('name')}</FieldError>}
            </div>

            {/* ---------------------------------------------------------- */}
            {/* Email                                                        */}
            {/* ---------------------------------------------------------- */}
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
                {fieldError('email') && <FieldError>{fieldError('email')}</FieldError>}
            </div>

            {/* ---------------------------------------------------------- */}
            {/* Password                                                     */}
            {/* ---------------------------------------------------------- */}
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
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400/70 focus:border-zinc-700 transition"
                />
                {fieldError('password') ? (
                    <FieldError>{fieldError('password')}</FieldError>
                ) : (
                    <p className="text-[11px] text-zinc-600">
                        At least 8 characters, with a letter and a number.
                    </p>
                )}
            </div>

            {/* ---------------------------------------------------------- */}
            {/* General error                                                */}
            {/* ---------------------------------------------------------- */}
            {generalError && (
                <div
                    role="alert"
                    className="flex items-start gap-2 p-3 text-xs text-red-400 bg-red-950/40 rounded-lg border border-red-900"
                >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{generalError}</span>
                </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* Submit                                                       */}
            {/* ---------------------------------------------------------- */}
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
                ) : role === 'seller' ? (
                    'Create seller account'
                ) : (
                    'Create customer account'
                )}
            </button>

            <p className="text-[11px] text-zinc-600 text-center pt-2">
                By creating an account you agree to our Terms of Service and Privacy Policy.
            </p>
        </form>
    );
}

/* -------------------------------------------------------------------------- */
/*  Role card                                                                  */
/* -------------------------------------------------------------------------- */

function RoleCard({
                      selected,
                      onClick,
                      icon,
                      title,
                      subtitle,
                  }: {
    selected: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={
                'flex flex-col items-start gap-2 rounded-xl border-2 p-3 text-left transition ' +
                (selected
                    ? 'border-zinc-100 bg-zinc-900'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40')
            }
        >
            <span
                className={
                    'flex h-8 w-8 items-center justify-center rounded-lg transition ' +
                    (selected
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'bg-zinc-900 text-zinc-400')
                }
            >
                {icon}
            </span>
            <span className="block">
                <span className="block text-sm font-semibold text-zinc-100">
                    {title}
                </span>
                <span className="block text-[11px] text-zinc-500 mt-0.5">
                    {subtitle}
                </span>
            </span>
        </button>
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