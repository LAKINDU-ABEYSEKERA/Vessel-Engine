import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { verifyPassword } from "@/lib/password";

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
    callbacks: {
        jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role =
                    (user as { role?: string }).role ?? "customer";
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