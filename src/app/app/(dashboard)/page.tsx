import { auth } from "@/auth";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Store } from "lucide-react";
import { CreateStoreForm } from "./create-store-form";

export default async function CreatorDashboardPage() {
    const session = await auth();
    const userId = session?.user?.id;

    const userStores = userId
        ? await db.select().from(stores).where(eq(stores.userId, userId))
        : [];

    const store = userStores[0];

    // ------------------------------------------------------------------
    // State 1: Onboarding Mode (No Store Found)
    // ------------------------------------------------------------------
    if (!store) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950/50">
                <CreateStoreForm />
            </div>
        );
    }

    // ------------------------------------------------------------------
    // State 2: Active Dashboard
    // ------------------------------------------------------------------
    return (
        <div className="flex-1 overflow-y-auto p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Welcome back, {session?.user?.name?.split(" ")[0]}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Here is what is happening with your storefront today.
                </p>
            </header>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                    <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                            <Store className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-zinc-900 dark:text-white">{store.name}</h2>
                            <p className="text-xs text-zinc-500 font-mono mt-0.5">
                                {store.subdomain}.vesselengine.com
                            </p>
                        </div>
                    </div>
                    <a
                        href={`http://${store.subdomain}.localhost:3000`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        View Live Storefront &rarr;
                    </a>
                </div>
            </div>
        </div>
    );
}