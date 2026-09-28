import Link from "next/link";
import { signOut, auth } from "@/auth";
import { ArrowLeft, ArrowRight, LogOut, Store } from "lucide-react";

import { PLATFORM_URL } from "@/lib/config";

import { SignupForm } from "./signup-form";

export default async function SignupPage() {
    const session = await auth();

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
                        href={PLATFORM_URL}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to home
                    </Link>
                </div>
            </header>

            <div className="flex flex-1 flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl mb-8">
                        <Store className="h-7 w-7 text-zinc-100" />
                    </div>

                    {session?.user ? (
                        <>
                            <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
                                You&apos;re already signed in
                            </h1>
                            <p className="text-sm text-zinc-400 mb-8">
                                Signed in as{" "}
                                <span className="font-medium text-zinc-200">
                                    {session.user.email ?? session.user.name ?? "your account"}
                                </span>
                                . Sign out below to create a separate account.
                            </p>

                            <Link
                                href="/app"
                                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 cursor-pointer"
                            >
                                Continue to dashboard
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <form
                                className="w-full mt-3"
                                action={async () => {
                                    "use server";
                                    await signOut({ redirectTo: "/app/signup" });
                                }}
                            >
                                <button
                                    type="submit"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200 cursor-pointer"
                                >
                                    <LogOut className="h-3.5 w-3.5" />
                                    Sign out and create a new account
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
                                Create your account
                            </h1>
                            <p className="text-sm text-zinc-400 mb-8">
                                Start selling in minutes. Free forever on the basic tier.
                            </p>

                            <SignupForm />

                            <p className="mt-6 text-sm text-zinc-500">
                                Already have an account?{" "}
                                <Link
                                    href="/app/login"
                                    className="font-medium text-zinc-200 hover:text-white"
                                >
                                    Sign in
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}