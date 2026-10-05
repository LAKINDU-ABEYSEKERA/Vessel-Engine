import 'server-only';
import { count, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import { orders, products, stores, stripeEvents, users } from '@/db/schema';

export async function listAdminUsers() {
    const rows = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
            storeCount: sql<number>`(
                SELECT COUNT(*)::int FROM ${stores}
                WHERE ${stores.userId} = ${users.id}
                  AND ${stores.deletedAt} IS NULL
            )`,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(200);

    return rows;
}

export async function listAdminStores() {
    const rows = await db
        .select({
            id: stores.id,
            name: stores.name,
            subdomain: stores.subdomain,
            ownerEmail: users.email,
            createdAt: stores.createdAt,
            deletedAt: stores.deletedAt,
            productCount: sql<number>`(
                SELECT COUNT(*)::int FROM ${products}
                WHERE ${products.storeId} = ${stores.id}
            )`,
            orderCount: sql<number>`(
                SELECT COUNT(*)::int FROM ${orders}
                WHERE ${orders.storeId} = ${stores.id}
            )`,
        })
        .from(stores)
        .leftJoin(users, eq(users.id, stores.userId))
        .orderBy(desc(stores.createdAt))
        .limit(200);

    return rows;
}

export async function listAdminOrders() {
    const rows = await db
        .select({
            id: orders.id,
            customerEmail: orders.customerEmail,
            totalAmountInCents: orders.totalAmountInCents,
            status: orders.status,
            createdAt: orders.createdAt,
            stripeSessionId: orders.stripeSessionId,
            storeName: stores.name,
            storeSubdomain: stores.subdomain,
        })
        .from(orders)
        .innerJoin(stores, eq(stores.id, orders.storeId))
        .orderBy(desc(orders.createdAt))
        .limit(200);

    return rows;
}

export async function listAdminStripeEvents() {
    const rows = await db
        .select({
            id: stripeEvents.id,
            eventId: stripeEvents.eventId,
            type: stripeEvents.type,
            createdAt: stripeEvents.createdAt,
            processedAt: stripeEvents.processedAt,
        })
        .from(stripeEvents)
        .orderBy(desc(stripeEvents.createdAt))
        .limit(200);

    return rows;
}

export async function countAdmin() {
    const [u] = await db.select({ value: count() }).from(users);
    const [s] = await db
        .select({ value: count() })
        .from(stores)
        .where(isNull(stores.deletedAt));
    const [o] = await db.select({ value: count() }).from(orders);
    const [e] = await db
        .select({ value: count() })
        .from(stripeEvents)
        .where(isNull(stripeEvents.processedAt));

    return {
        users: Number(u?.value ?? 0),
        stores: Number(s?.value ?? 0),
        orders: Number(o?.value ?? 0),
        pendingEvents: Number(e?.value ?? 0),
    };
}