import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type Stripe from "stripe";
import {
    ArrowLeft,
    ArrowUpRight,
    CheckCircle2,
    DownloadCloud,
    FileWarning,
    Mail,
    Receipt,
    ShieldCheck,
    Sparkles,
    Store,
} from "lucide-react";

import { CartClear } from "@/components/storefront/cart-clear";
import { getTenantStore } from "@/db/queries/storefront";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/* ========================================================================== */
/*  Config                                                                     */
/* ========================================================================== */

/** Where the "Download asset" buttons point. The route re-verifies the
 *  session server-side before handing back a signed URL — never trust the
 *  query string alone. */
function downloadHref(sessionId: string, productId: string) {
    return `/api/fulfillment/download?session_id=${encodeURIComponent(
        sessionId,
    )}&product=${encodeURIComponent(productId)}`;
}

/* ========================================================================== */
/*  Local helpers (kept inline so the file stays self-contained)               */
/* ========================================================================== */

function cx(...values: Array<string | false | null | undefined>): string {
    return values.filter(Boolean).join(" ");
}

function formatMoney(amount: number | null | undefined, currency = "usd"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format((amount ?? 0) / 100);
}

/** `cs_test_a1B2c3...` -> `VSL-A1B2C3D4` */
function formatReceiptId(sessionId: string): string {
    const tail = sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
    return `VSL-${tail}`;
}

function formatOrderDate(created: number): string {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(created * 1000));
}

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

type PageProps = {
    params: Promise<{ tenant: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type OrderLine = {
    id: string;
    productId: string | null;
    name: string;
    description: string | null;
    quantity: number;
    amountTotal: number;
    imageUrl: string | null;
    isDigital: boolean;
    fileFormat: string | null;
    fileSize: string | null;
};

type FailureReason = "missing-session" | "not-found" | "unpaid" | "wrong-store";

/* ========================================================================== */
/*  Metadata                                                                   */
/* ========================================================================== */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { tenant } = await params;
    return {
        title: "Order confirmed",
        description: `Your order from ${tenant} is confirmed.`,
        robots: { index: false, follow: false },
    };
}

/* ========================================================================== */
/*  Page                                                                       */
/* ========================================================================== */

export default async function OrderSuccessPage({ params, searchParams }: PageProps) {
    const { tenant } = await params;
    const query = await searchParams;

    const rawSessionId = query.session_id;
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

    const storeRecord = (await getTenantStore(tenant)) as
        | { id: string | number; name?: string | null; title?: string | null }
        | null
        | undefined;

    if (!storeRecord) notFound();

    const storeId = String(storeRecord.id);
    const storeName = storeRecord.name ?? storeRecord.title ?? tenant;
    const storeHref = `/`;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-zinc-100 selection:text-zinc-900">
            <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900 font-mono text-xs tracking-tight text-zinc-400">
                            {storeName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate text-sm font-medium tracking-tight text-zinc-100">
              {storeName}
            </span>
                    </div>

                    <Link
                        href={storeHref}
                        className={cx(
                            "inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3.5",
                            "text-sm font-medium tracking-tight text-zinc-400 transition duration-200",
                            "hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                        )}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                        Back to shop
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-6 pb-24 pt-16">
                {!sessionId ? (
                    <OrderFailure reason="missing-session" storeHref={storeHref} />
                ) : (
                    <Suspense fallback={<OrderSkeleton />}>
                        <VerifiedOrder
                            sessionId={sessionId}
                            storeId={storeId}
                            storeName={storeName}
                            storeHref={storeHref}
                        />
                    </Suspense>
                )}
            </main>

            <footer className="border-t border-zinc-800/80">
                <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-4 px-6 py-10 sm:flex-row sm:items-center">
                    <p className="text-sm text-zinc-500">
                        Questions about this order? Reply to your receipt email.
                    </p>
                    <p className="inline-flex items-center gap-2 text-sm text-zinc-600">
                        <Store className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Powered by
                        <span className="font-medium tracking-tight text-zinc-400">Vessel Engine</span>
                    </p>
                </div>
            </footer>
        </div>
    );
}

/* ========================================================================== */
/*  Server data boundary                                                       */
/* ========================================================================== */

async function VerifiedOrder({
                                 sessionId,
                                 storeId,
                                 storeName,
                                 storeHref,
                             }: {
    sessionId: string;
    storeId: string;
    storeName: string;
    storeHref: string;
}) {
    let session: Stripe.Checkout.Session;

    try {
        session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["line_items.data.price.product"],
        });
    } catch {
        return <OrderFailure reason="not-found" storeHref={storeHref} />;
    }

    // The session must belong to this tenant. Set `storeId` in the session
    // metadata when you create it, otherwise this check is skipped.
    const sessionStoreId = session.metadata?.storeId ?? session.metadata?.store_id;
    if (sessionStoreId && sessionStoreId !== storeId) {
        return <OrderFailure reason="wrong-store" storeHref={storeHref} />;
    }

    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
        return <OrderFailure reason="unpaid" storeHref={storeHref} />;
    }

    const currency = session.currency ?? "usd";
    const lines: OrderLine[] = (session.line_items?.data ?? []).map((item: Stripe.LineItem) => {
        const product = item.price?.product;
        const expanded =
            product && typeof product === "object" && !("deleted" in product && product.deleted)
                ? (product as Stripe.Product)
                : null;

        const metadata = expanded?.metadata ?? {};
        const isDigital =
            metadata.type?.toLowerCase() === "digital" ||
            metadata.fulfillment?.toLowerCase() === "digital" ||
            metadata.isDigital === "true" ||
            Boolean(metadata.download_url);

        return {
            id: item.id,
            // Prefer the DB UUID we stashed in `product_data.metadata.productId`
            // at checkout time. Falls back to the Stripe Product ID so legacy
            // sessions (created before this change) still resolve.
            productId:
                expanded?.metadata?.productId ??
                expanded?.id ??
                (typeof product === "string" ? product : null),
            name: expanded?.name ?? item.description ?? "Item",
            description: expanded?.description ?? null,
            quantity: item.quantity ?? 1,
            amountTotal: item.amount_total ?? 0,
            imageUrl: expanded?.images?.[0] ?? null,
            isDigital,
            fileFormat: metadata.format ?? metadata.file_format ?? null,
            fileSize: metadata.file_size ?? metadata.size ?? null,
        };
    });

    const digitalLines = lines.filter((line) => line.isDigital);
    const email = session.customer_details?.email ?? null;
    const discount = session.total_details?.amount_discount ?? 0;
    const shipping = session.total_details?.amount_shipping ?? 0;
    const tax = session.total_details?.amount_tax ?? 0;

    return (
        <div className="flex flex-col gap-8">
            {/* Clears this tenant's local cart once payment is verified server-side */}
            <CartClear storeId={storeId} />

            <SuccessHero
                email={email}
                storeName={storeName}
                receiptId={session.metadata?.orderNumber ?? formatReceiptId(session.id)}
                placedAt={formatOrderDate(session.created)}
            />

            {digitalLines.length > 0 ? (
                <DigitalFulfillment lines={digitalLines} sessionId={session.id} />
            ) : null}

            <OrderReceipt
                lines={lines}
                currency={currency}
                subtotal={session.amount_subtotal ?? 0}
                discount={discount}
                shipping={shipping}
                tax={tax}
                total={session.amount_total ?? 0}
            />

            <div className="flex flex-col items-center gap-3 pt-2">
                <Link
                    href={storeHref}
                    className={cx(
                        "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-6",
                        "text-sm font-medium tracking-tight text-zinc-900 transition duration-200 hover:bg-white",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                    )}
                >
                    Keep shopping
                    <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                </Link>
                <p className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Payment processed securely by Stripe
                </p>
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  Success hero                                                               */
/* ========================================================================== */

function SuccessHero({
                         email,
                         storeName,
                         receiptId,
                         placedAt,
                     }: {
    email: string | null;
    storeName: string;
    receiptId: string;
    placedAt: string;
}) {
    return (
        <section className="flex flex-col items-center text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
        <span
            className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl"
            aria-hidden="true"
        />
                <span
                    className="absolute inset-2 rounded-full border border-emerald-500/20"
                    aria-hidden="true"
                />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_40px_-8px_rgba(16,185,129,0.45)]">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" strokeWidth={1.75} />
        </span>
            </div>

            <h1 className="mt-7 text-3xl font-medium tracking-tight text-white md:text-4xl">
                Payment successful
            </h1>

            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-zinc-400">
                Thanks for supporting {storeName}.{" "}
                {email ? (
                    <>
                        A receipt is on its way to{" "}
                        <span className="font-medium text-zinc-200">{email}</span>.
                    </>
                ) : (
                    <>Your receipt has been emailed to you.</>
                )}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5 backdrop-blur-md">
          <Receipt className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.75} />
          <span className="font-mono text-[11px] tabular-nums tracking-tight text-zinc-200">
            {receiptId}
          </span>
        </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5 text-[13px] tracking-tight text-zinc-500 backdrop-blur-md">
          {placedAt}
        </span>
                {email ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5 text-[13px] tracking-tight text-zinc-500 backdrop-blur-md">
            <Mail className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.75} />
            Receipt sent
          </span>
                ) : null}
            </div>
        </section>
    );
}

/* ========================================================================== */
/*  Digital fulfillment                                                        */
/* ========================================================================== */

function DigitalFulfillment({
                                lines,
                                sessionId,
                            }: {
    lines: OrderLine[];
    sessionId: string;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl">
            <header className="flex items-center justify-between gap-4 border-b border-zinc-800/80 px-5 py-4">
                <div className="flex items-center gap-2.5">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
          </span>
                    <h2 className="text-sm font-medium tracking-tight text-zinc-100">
                        Your downloads
                    </h2>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-zinc-500">
          {lines.length} {lines.length === 1 ? "file" : "files"} ready
        </span>
            </header>

            <ul className="divide-y divide-zinc-800/60">
                {lines.map((line) => (
                    <li
                        key={line.id}
                        className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
                                <Sparkles className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium tracking-tight text-zinc-100">
                                    {line.name}
                                </p>
                                <p className="mt-1 flex items-center gap-2 font-mono text-[11px] tracking-tight text-zinc-500">
                                    {line.fileFormat ? <span>{line.fileFormat.toUpperCase()}</span> : null}
                                    {line.fileFormat && line.fileSize ? (
                                        <span className="text-zinc-700" aria-hidden="true">
                      /
                    </span>
                                    ) : null}
                                    {line.fileSize ? <span className="tabular-nums">{line.fileSize}</span> : null}
                                    {!line.fileFormat && !line.fileSize ? <span>Ready to download</span> : null}
                                </p>
                            </div>
                        </div>

                        <a
                            href={line.productId ? downloadHref(sessionId, line.productId) : "#"}
                            className={cx(
                                "group inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-4",
                                "border-zinc-800 bg-zinc-100 text-sm font-medium tracking-tight text-zinc-900",
                                "transition duration-200 hover:border-zinc-200 hover:bg-white",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                            )}
                        >
                            <DownloadCloud
                                className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                                strokeWidth={1.75}
                            />
                            Download asset
                        </a>
                    </li>
                ))}
            </ul>

            <p className="border-t border-zinc-800/80 px-5 py-3.5 text-xs leading-relaxed text-zinc-600">
                Download links stay active for 30 days. The same links are in your receipt email.
            </p>
        </section>
    );
}

/* ========================================================================== */
/*  Receipt                                                                    */
/* ========================================================================== */

function OrderReceipt({
                          lines,
                          currency,
                          subtotal,
                          discount,
                          shipping,
                          tax,
                          total,
                      }: {
    lines: OrderLine[];
    currency: string;
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900">
            <header className="flex items-center justify-between gap-4 border-b border-zinc-800/80 px-5 py-4">
                <h2 className="text-sm font-medium tracking-tight text-zinc-100">Order summary</h2>
                <span className="font-mono text-[11px] tabular-nums text-zinc-500">
          {lines.length} {lines.length === 1 ? "line" : "lines"}
        </span>
            </header>

            <ul className="divide-y divide-zinc-800/60">
                {lines.map((line) => (
                    <li key={line.id} className="flex items-center gap-4 px-5 py-4">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950">
                            {line.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={line.imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div
                                    className="flex h-full w-full items-center justify-center font-mono text-[11px] text-zinc-700"
                                    style={{
                                        backgroundImage:
                                            "linear-gradient(to right, rgb(39 39 42 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgb(39 39 42 / 0.5) 1px, transparent 1px)",
                                        backgroundSize: "12px 12px",
                                    }}
                                >
                                    {line.name.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium tracking-tight text-zinc-100">
                                {line.name}
                            </p>
                            <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-500">
                                Qty {line.quantity}
                            </p>
                        </div>

                        <p className="shrink-0 font-mono text-sm tabular-nums tracking-tight text-zinc-100">
                            {formatMoney(line.amountTotal, currency)}
                        </p>
                    </li>
                ))}
            </ul>

            <dl className="border-t border-zinc-800/80 px-5 py-4">
                <SummaryRow label="Subtotal" value={formatMoney(subtotal, currency)} />
                {discount > 0 ? (
                    <SummaryRow
                        label="Discount"
                        value={`−${formatMoney(discount, currency)}`}
                        accent="emerald"
                    />
                ) : null}
                {shipping > 0 ? (
                    <SummaryRow label="Shipping" value={formatMoney(shipping, currency)} />
                ) : null}
                {tax > 0 ? <SummaryRow label="Tax" value={formatMoney(tax, currency)} /> : null}

                <div className="mt-3 flex items-baseline justify-between border-t border-zinc-800/80 pt-3.5">
                    <dt className="text-sm font-medium tracking-tight text-zinc-100">Total paid</dt>
                    <dd className="font-mono text-lg tabular-nums tracking-tight text-white">
                        {formatMoney(total, currency)}
                    </dd>
                </div>
            </dl>
        </section>
    );
}

function SummaryRow({
                        label,
                        value,
                        accent,
                    }: {
    label: string;
    value: string;
    accent?: "emerald";
}) {
    return (
        <div className="flex items-baseline justify-between py-1.5">
            <dt className="text-sm text-zinc-400">{label}</dt>
            <dd
                className={cx(
                    "font-mono text-sm tabular-nums tracking-tight",
                    accent === "emerald" ? "text-emerald-400" : "text-zinc-300",
                )}
            >
                {value}
            </dd>
        </div>
    );
}

/* ========================================================================== */
/*  Loading skeleton                                                           */
/* ========================================================================== */

function Shimmer({ className }: { className: string }) {
    return (
        <div
            className={cx(
                "animate-pulse rounded-md bg-zinc-800/60 motion-reduce:animate-none",
                className,
            )}
            aria-hidden="true"
        />
    );
}

function OrderSkeleton() {
    return (
        <div className="flex flex-col gap-8" role="status" aria-live="polite">
            <span className="sr-only">Verifying your payment</span>

            <div className="flex flex-col items-center">
                <div className="relative flex h-20 w-20 items-center justify-center">
          <span
              className="absolute inset-0 animate-pulse rounded-full bg-zinc-800/40 blur-2xl motion-reduce:animate-none"
              aria-hidden="true"
          />
                    <span className="relative h-14 w-14 rounded-full border border-zinc-800 bg-zinc-900" />
                </div>
                <Shimmer className="mt-7 h-9 w-64" />
                <Shimmer className="mt-4 h-4 w-80" />
                <Shimmer className="mt-2 h-4 w-52" />
                <div className="mt-7 flex gap-2">
                    <Shimmer className="h-8 w-32 rounded-full" />
                    <Shimmer className="h-8 w-40 rounded-full" />
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60">
                <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
                    <Shimmer className="h-4 w-32" />
                    <Shimmer className="h-3 w-20" />
                </div>
                {[0, 1].map((row) => (
                    <div
                        key={row}
                        className="flex items-center justify-between gap-4 border-b border-zinc-800/60 px-5 py-4 last:border-0"
                    >
                        <div className="flex items-center gap-4">
                            <Shimmer className="h-11 w-11 rounded-xl" />
                            <div>
                                <Shimmer className="h-4 w-44" />
                                <Shimmer className="mt-2 h-3 w-24" />
                            </div>
                        </div>
                        <Shimmer className="h-10 w-40 rounded-xl" />
                    </div>
                ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
                    <Shimmer className="h-4 w-32" />
                    <Shimmer className="h-3 w-16" />
                </div>
                {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center gap-4 border-b border-zinc-800/60 px-5 py-4">
                        <Shimmer className="h-12 w-12 rounded-xl" />
                        <div className="flex-1">
                            <Shimmer className="h-4 w-52" />
                            <Shimmer className="mt-2 h-3 w-14" />
                        </div>
                        <Shimmer className="h-4 w-16" />
                    </div>
                ))}
                <div className="px-5 py-5">
                    <Shimmer className="ml-auto h-6 w-32" />
                </div>
            </div>
        </div>
    );
}

/* ========================================================================== */
/*  Failure states                                                             */
/* ========================================================================== */

const FAILURE_COPY: Record<FailureReason, { title: string; body: string }> = {
    "missing-session": {
        title: "No order to show",
        body: "This page opens automatically after checkout. Start a purchase and you'll land back here with your receipt.",
    },
    "not-found": {
        title: "We couldn't find that order",
        body: "The checkout link has expired or the reference is incorrect. If you were charged, your receipt email has the working link.",
    },
    unpaid: {
        title: "Payment hasn't cleared",
        body: "This checkout was started but not completed. Nothing has been charged — you can head back and try again.",
    },
    "wrong-store": {
        title: "That order belongs to another shop",
        body: "This receipt was issued by a different store on Vessel. Open the link from your receipt email to view it.",
    },
};

function OrderFailure({
                          reason,
                          storeHref,
                      }: {
    reason: FailureReason;
    storeHref: string;
}) {
    const copy = FAILURE_COPY[reason];

    return (
        <section className="flex flex-col items-center py-12 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
                <svg
                    viewBox="0 0 80 80"
                    className="absolute inset-0 h-full w-full text-zinc-800"
                    fill="none"
                    aria-hidden="true"
                >
                    <circle
                        cx="40"
                        cy="40"
                        r="39"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="3 6"
                        opacity="0.7"
                    />
                </svg>
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
          <FileWarning className="h-6 w-6 text-zinc-500" strokeWidth={1.5} />
        </span>
            </div>

            <h1 className="mt-7 text-2xl font-medium tracking-tight text-zinc-100 md:text-3xl">
                {copy.title}
            </h1>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-zinc-500">{copy.body}</p>

            <Link
                href={storeHref}
                className={cx(
                    "mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-6",
                    "text-sm font-medium tracking-tight text-zinc-100 transition duration-200",
                    "hover:border-zinc-700 hover:bg-zinc-800",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                )}
            >
                <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                Back to shop
            </Link>
        </section>
    );
}