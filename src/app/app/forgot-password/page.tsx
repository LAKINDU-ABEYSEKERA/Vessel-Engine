import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";

import { PLATFORM_URL } from "@/lib/config";

import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
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

                    <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
                        Reset your password
                    </h1>
                    <p className="text-sm text-zinc-400 mb-8">
                        Enter the email you used to sign up and we&apos;ll send
                        you a link to set a new password.
                    </p>

                    <ForgotPasswordForm />

                    <p className="mt-6 text-[11px] text-zinc-600 max-w-[40ch]">
                        Signed up with Google? You can use this same form to
                        set a password and sign in with email too.
                    </p>
                </div>
            </div>
        </div>
    );
}