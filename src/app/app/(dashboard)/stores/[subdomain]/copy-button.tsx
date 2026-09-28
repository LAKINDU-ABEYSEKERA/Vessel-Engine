"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

interface CopyStorefrontLinkButtonProps {
    /** Full absolute URL, e.g. `http://acme.localhost:3000` */
    url: string;
}

export function CopyStorefrontLinkButton({
                                             url,
                                         }: CopyStorefrontLinkButtonProps) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard permissions may be denied in some browsers
            // (especially non-HTTPS origins). Fail silently — the user
            // can still select the URL or click Open.
        }
    }

    return (
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy storefront link"}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
                {copied ? (
                    <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">
                            Copied
                        </span>
                    </>
                ) : (
                    <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                    </>
                )}
            </button>

            <span
                className="h-4 w-px bg-zinc-200 dark:bg-zinc-800"
                aria-hidden="true"
            />

            <a
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-label="Open storefront in new tab"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
            </a>
        </div>
    );
}