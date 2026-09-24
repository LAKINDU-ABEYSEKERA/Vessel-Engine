"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function CheckoutCanceledToastInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const firedRef = useRef(false);

    useEffect(() => {
        if (firedRef.current) return;
        if (searchParams.get("canceled") !== "true") return;

        firedRef.current = true;

        toast.error("Checkout canceled", {
            description: "Your cart is still here whenever you're ready.",
            duration: 5000,
        });

        // Strip `canceled` so a refresh doesn't replay the toast.
        const next = new URLSearchParams(searchParams.toString());
        next.delete("canceled");
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
            scroll: false,
        });
    }, [searchParams, router, pathname]);

    return null;
}

/**
 * Fires a Sonner toast once when the user returns from Stripe having
 * canceled. Rendered from the storefront page; wrapped in <Suspense>
 * because `useSearchParams()` requires an ancestor boundary in the
 * App Router.
 */
export function CheckoutCanceledToast() {
    return (
        <Suspense fallback={null}>
            <CheckoutCanceledToastInner />
        </Suspense>
    );
}