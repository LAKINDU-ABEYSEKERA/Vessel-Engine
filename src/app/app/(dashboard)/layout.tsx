import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { LogOut, Store, Package, Settings, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default async function DashboardLayout({
                                                  children,
                                              }: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/app/login");
    }

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
            <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-medium tracking-tight">
                        <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-1.5 rounded-lg">
                            <Store size={16} />
                        </div>
                        Vessel Engine
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                    <Link
                        href="/app"
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white"
                    >
                        <LayoutDashboard size={16} />
                        Overview
                    </Link>
                    <Link
                        href="/app/products"
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors"
                    >
                        <Package size={16} />
                        Products
                    </Link>
                    <Link
                        href="/app/settings"
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors"
                    >
                        <Settings size={16} />
                        Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3 px-3 py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={session.user.image || ""}
                            alt=""
                            className="w-8 h-8 rounded-full bg-zinc-200"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                {session.user.name}
                            </p>
                        </div>
                    </div>
                    <form
                        action={async () => {
                            "use server";
                            await signOut({ redirectTo: "/app/login" });
                        }}
                    >
                        <button
                            type="submit"
                            className="flex w-full items-center gap-3 px-3 py-2 mt-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        >
                            <LogOut size={16} />
                            Log out
                        </button>
                    </form>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {children}
            </main>
        </div>
    );
}