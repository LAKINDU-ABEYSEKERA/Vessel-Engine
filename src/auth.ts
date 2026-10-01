import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { computeEffectiveRole } from "@/lib/roles";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
        } & DefaultSession["user"];
    }
    interface User {
        role?: string;
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id?: string;
        role?: string;
    }
}

const isProd = process.env.NODE_ENV === 'production';

/**
 * Multi-tenant cookie domain.
 *
 * Production: `.vesselengine.com` — one session, shared by the apex and
 * every tenant subdomain (acme.vesselengine.com, artisan.vesselengine.com…).
 *
 * Development: `localhost` — browsers accept this as a cookie domain for
 * both `localhost:3000` and `acme.localhost:3000`. The leading dot is
 * omitted because some browsers reject `.localhost`.
 *
 * The `__Host-` / `__Secure-` prefixes are deliberately NOT used here:
 * they require the cookie to have NO Domain attribute, which is the exact
 * opposite of what multi-tenant auth needs.
 */
const cookieDomain = isProd ? '.vesselengine.com' : 'localhost';

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }),
    providers: [
        Google({
            checks: ["state"],
        }),
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) return null;

                const email = String(credentials.email).toLowerCase().trim();
                const password = String(credentials.password);

                const [user] = await db
                    .select()
                    .from(users)
                    .where(eq(users.email, email))
                    .limit(1);

                if (!user || !user.passwordHash) return null;

                const valid = await verifyPassword(password, user.passwordHash);
                if (!valid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                };
            },
        }),
    ],
    pages: {
        signIn: "/app/login",
    },
    session: {
        strategy: "jwt",
    },
    cookies: {
        sessionToken: {
            name: isProd
                ? '__Secure-authjs.session-token'
                : 'authjs.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: isProd,
                domain: cookieDomain,
            },
        },
        callbackUrl: {
            name: isProd
                ? '__Secure-authjs.callback-url'
                : 'authjs.callback-url',
            options: {
                sameSite: 'lax',
                path: '/',
                secure: isProd,
                domain: cookieDomain,
            },
        },
        csrfToken: {
            name: isProd
                ? '__Host-authjs.csrf-token'
                : 'authjs.csrf-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: isProd,
                domain: cookieDomain,
            },
        },
    },
    callbacks: {
        jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = computeEffectiveRole({
                    email: user.email,
                    role: (user as { role?: string }).role,
                });
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.id ?? "";
                session.user.role = token.role ?? "customer";
            }
            return session;
        },
    },
});