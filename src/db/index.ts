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
        max: 1,
    });

if (process.env.NODE_ENV !== 'production') {
    globalForDb.client = client;
}

export const db = globalForDb.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== 'production') {
    globalForDb.db = db;
}