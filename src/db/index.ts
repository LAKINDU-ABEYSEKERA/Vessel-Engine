import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
    client?: postgres.Sql;
    db?: ReturnType<typeof drizzle<typeof schema>>;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables.');
}

export const client =
    globalForDb.client ??
    postgres(connectionString, {
        max: 5,               // ← was 10 — Supabase free tier is
                              //    tight; 5 is plenty for local dev.
        idle_timeout: 20,
        connect_timeout: 30,  // ← was 10 — Supabase sometimes takes
                              //    >10s to establish a fresh pooled
                              //    connection after a cold start.
        prepare: false,       // Required for Supabase transaction pooler
    });

if (process.env.NODE_ENV !== 'production') {
    globalForDb.client = client;
}

export const db = globalForDb.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== 'production') {
    globalForDb.db = db;
}