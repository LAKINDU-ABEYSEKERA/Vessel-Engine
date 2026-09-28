import Link from 'next/link';
import { ArrowRight, Store } from 'lucide-react';

export function PlatformHeader() {
    return (
        <header className="border-b border-zinc-800/80">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
                <Link
                    href="/"
                    className="flex items-center gap-2.5 text-zinc-100 transition hover:opacity-80"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
                        <Store className="h-4 w-4" />
                    </div>
                    <span className="font-medium tracking-tight">
                        Vessel Engine
                    </span>
                </Link>

                <nav className="flex items-center gap-1">
                    <Link
                        href="/pricing"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900/60 hover:text-zinc-100"
                    >
                        Pricing
                    </Link>
                    <Link
                        href="/docs"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900/60 hover:text-zinc-100"
                    >
                        Docs
                    </Link>
                    <Link
                        href="/app/login"
                        className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900"
                    >
                        Sign in
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </nav>
            </div>
        </header>
    );
}