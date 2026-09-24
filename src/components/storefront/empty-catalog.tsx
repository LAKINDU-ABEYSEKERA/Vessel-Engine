import { PackageOpen } from "lucide-react";

export function EmptyCatalog({ storeName }: { storeName: string }) {
    return (
        <div className="flex flex-col items-center px-6 py-24 text-center">
            <div className="relative flex h-40 w-40 items-center justify-center">
                {/* Custom vector framing: concentric hairline rings + corner registration marks. */}
                <svg
                    viewBox="0 0 160 160"
                    className="absolute inset-0 h-full w-full text-zinc-800"
                    fill="none"
                    aria-hidden="true"
                >
                    <circle cx="80" cy="80" r="78" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" opacity="0.7" />
                    <circle cx="80" cy="80" r="58" stroke="currentColor" strokeWidth="1" opacity="0.55" />
                    <rect x="44" y="44" width="72" height="72" rx="20" stroke="currentColor" strokeWidth="1" opacity="0.9" />
                    <path d="M80 2v14M80 144v14M2 80h14M144 80h14" stroke="currentColor" strokeWidth="1" opacity="0.8" />
                </svg>

                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900 shadow-lg shadow-black/40">
                    <PackageOpen className="h-6 w-6 text-zinc-500" strokeWidth={1.5} />
                </div>
            </div>

            <h2 className="mt-9 text-xl font-medium tracking-tight text-zinc-100">
                The shelves are empty
            </h2>
            <p className="mt-2.5 max-w-[46ch] text-sm leading-relaxed text-zinc-500">
                {storeName} hasn&apos;t published anything yet. Check back soon, or follow along
                for the first drop.
            </p>

            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5 font-mono text-[11px] tabular-nums text-zinc-500">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" aria-hidden="true" />
        0 products live
      </span>
        </div>
    );
}
