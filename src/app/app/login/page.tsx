import { signIn, signOut, auth } from "@/auth";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LogOut, Store } from "lucide-react";

import { PLATFORM_URL } from "@/lib/config";

export default async function LoginPage() {
    const session = await auth();

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-zinc-100 selection:text-zinc-900">
            {/* -------------------------------------------------------- */}
            {/* Header                                                    */}
            {/* -------------------------------------------------------- */}
            <header className="border-b border-zinc-800/80 shrink-0">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                    <Link
                        href={PLATFORM_URL}
                        className="flex items-center gap-2.5 text-zinc-100 transition hover:opacity-80"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
                            <Store className="h-4 w-4" />
                        </div>
                        <span className="font-medium tracking-tight">
                            Vessel Engine
                        </span>
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

            {/* -------------------------------------------------------- */}
            {/* Body                                                      */}
            {/* -------------------------------------------------------- */}
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
                                .
                            </p>

                            <Link
                                href="/app"
                                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950 cursor-pointer"
                            >
                                Continue to dashboard
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            <form
                                className="w-full mt-3"
                                action={async () => {
                                    "use server";
                                    await signOut({ redirectTo: "/app/login" });
                                }}
                            >
                                <button
                                    type="submit"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200 cursor-pointer"
                                >
                                    <LogOut className="h-3.5 w-3.5" />
                                    Sign out and use a different account
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
                                Welcome to Vessel Engine
                            </h1>
                            <p className="text-sm text-zinc-400 mb-8">
                                Sign in or create an account to manage your headless storefront.
                            </p>

                            <form
                                className="w-full"
                                action={async () => {
                                    "use server";
                                    await signIn("google", { redirectTo: "/app" });
                                }}
                            >
                                <button
                                    type="submit"
                                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950 cursor-pointer"
                                >
                                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                                        />
                                    </svg>
                                    Continue with Google
                                </button>
                            </form>

                            <p className="mt-8 text-[11px] text-zinc-500 max-w-[40ch]">
                                By signing in, you agree to our Terms of Service and Privacy Policy. Secure authentication provided by Auth.js.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}