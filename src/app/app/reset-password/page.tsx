import Link from "next/link";
import { AlertCircle, ArrowLeft, Store } from "lucide-react";

import { PLATFORM_URL } from "@/lib/config";

import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
                                                    searchParams,
                                                }: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token } = await searchParams;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-zinc-100 selection:text-zinc-900">
            <header className="border-b border-zinc-800/80 shrink-0">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                    <Link
                        href={PLATFORM_URL}
                        className="flex items-center gap-2.5 text-zinc-100 transition hover:opacity-80"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
                            <Store className="h-4 w-4" />
                        </div>
                        <span className="font-medium tracking-tight">Vessel Engine</span>
                    </Link>

                    <Link
                        href="/app/login"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to sign in
                    </Link>
                </div>
            </header>

            <div className="flex flex-1 flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl mb-8">
                        <Store className="h-7 w-7 text-zinc-100" />
                    </div>

                    {!token ? (
                        <>
                            <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
                                Invalid link
                            </h1>
                            <p className="text-sm text-zinc-400 mb-6">
                                This password reset link is missing its token.
                            </p>
                            <div className="w-full flex items-start gap-2 p-3 text-xs text-amber-300 bg-amber-950/30 rounded-lg border border-amber-900 text-left mb-6">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>
                                    Reset links expire after 1 hour and can
                                    only be used once.
                                </span>
                            </div>
                            <Link
                                href="/app/forgot-password"
                                className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
                            >
                                Request a new link
                            </Link>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
                                Set a new password
                            </h1>
                            <p className="text-sm text-zinc-400 mb-8">
                                Choose a new password for your account.
                            </p>
                            <ResetPasswordForm token={token} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}