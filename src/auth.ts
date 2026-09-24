import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
        } & DefaultSession["user"];
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id?: string;
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
            }
            return token;
        },
        session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id;
            }
            return session;
        },
    },
});