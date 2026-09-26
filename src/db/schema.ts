import {
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    boolean,
    uniqueIndex,
    index,
    primaryKey,
    check,
} from 'drizzle-orm/pg-core';
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import type { AdapterAccountType } from 'next-auth/adapters';

// ------------------------------------------------------------------
// Auth.js tables
// ------------------------------------------------------------------
export const users = pgTable('user', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => randomUUID()),
    name: text('name'),
    email: text('email').unique(),
    emailVerified: timestamp('emailVerified', { mode: 'date' }),
    image: text('image'),
});

export const accounts = pgTable(
    'account',
    {
        userId: text('userId')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: text('type').$type<AdapterAccountType>().notNull(),
        provider: text('provider').notNull(),
        providerAccountId: text('providerAccountId').notNull(),
        refresh_token: text('refresh_token'),
        access_token: text('access_token'),
        expires_at: integer('expires_at'),
        token_type: text('token_type'),
        scope: text('scope'),
        id_token: text('id_token'),
        session_state: text('session_state'),
    },
    (account) => ({
        compoundKey: primaryKey({
            columns: [account.provider, account.providerAccountId],
        }),
    })
);

export const sessions = pgTable('session', {
    sessionToken: text('sessionToken').primaryKey(),
    userId: text('userId')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
    'verificationToken',
    {
        identifier: text('identifier').notNull(),
        token: text('token').notNull(),
        expires: timestamp('expires', { mode: 'date' }).notNull(),
    },
    (vt) => ({
        compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    })
);

// ------------------------------------------------------------------
// Store (tenant) table
// ------------------------------------------------------------------
export const stores = pgTable(
    'stores',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: text('user_id').references(() => users.id, {
            onDelete: 'cascade',
        }),
        name: text('name').notNull(),
        subdomain: text('subdomain').notNull(),
        customDomain: text('custom_domain'),
        deletedAt: timestamp('deleted_at'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        userIdx: index('stores_user_id_idx').on(table.userId),
        subdomainFormat: check(
            'stores_subdomain_format',
            sql`${table.subdomain} ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'`
        ),
        subdomainActiveUnique: uniqueIndex('stores_subdomain_active_unique')
            .on(table.subdomain)
            .where(sql`${table.deletedAt} IS NULL`),
        customDomainActiveUnique: uniqueIndex('stores_custom_domain_active_unique')
            .on(table.customDomain)
            .where(sql`${table.deletedAt} IS NULL AND ${table.customDomain} IS NOT NULL`),
    })
);

// ------------------------------------------------------------------
// Category table (child of Store)
// ------------------------------------------------------------------
export const categories = pgTable(
    'categories',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        storeId: uuid('store_id')
            .notNull()
            .references(() => stores.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        slug: text('slug').notNull(),
        /** Visual label only — drives icon + color. Not schema-shaping. */
        type: text('type').notNull().default('other'),
        position: integer('position').notNull().default(0),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        storeSlugUnique: uniqueIndex('categories_store_slug_unique_idx').on(
            table.storeId,
            table.slug
        ),
        storeIdx: index('categories_store_id_idx').on(table.storeId),
        storePositionIdx: index('categories_store_position_idx').on(
            table.storeId,
            table.position
        ),
    })
);

// ------------------------------------------------------------------
// Product table (child of Store)
// ------------------------------------------------------------------
export const products = pgTable(
    'products',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        storeId: uuid('store_id')
            .notNull()
            .references(() => stores.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        slug: text('slug').notNull(),
        description: text('description'),
        priceInCents: integer('price_in_cents').notNull(),
        inventory: integer('inventory').notNull().default(0),
        isDigital: boolean('is_digital').notNull().default(false),
        assetUrl: text('asset_url'),
        imageUrl: text('image_url'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        storeSlugUnique: uniqueIndex('store_slug_unique_idx').on(
            table.storeId,
            table.slug
        ),
        storeIdx: index('products_store_id_idx').on(table.storeId),
    })
);

// ------------------------------------------------------------------
// Product ↔ Category junction (many-to-many)
// ------------------------------------------------------------------
export const productCategories = pgTable(
    'product_categories',
    {
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        categoryId: uuid('category_id')
            .notNull()
            .references(() => categories.id, { onDelete: 'cascade' }),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.productId, table.categoryId] }),
        categoryIdx: index('product_categories_category_id_idx').on(
            table.categoryId
        ),
    })
);

// ------------------------------------------------------------------
// Order table (child of Store)
// ------------------------------------------------------------------
export const orders = pgTable(
    'orders',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        storeId: uuid('store_id')
            .notNull()
            .references(() => stores.id, { onDelete: 'cascade' }),
        customerEmail: text('customer_email'),
        totalAmountInCents: integer('total_amount_in_cents').notNull(),
        stripeSessionId: text('stripe_session_id').unique(),
        stripePaymentIntentId: text('stripe_payment_intent_id'),
        status: text('status').notNull().default('pending'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        storeIdx: index('orders_store_id_idx').on(table.storeId),
    })
);

// ------------------------------------------------------------------
// OrderItem table (child of Order and Store)
// ------------------------------------------------------------------
export const orderItems = pgTable(
    'order_items',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        storeId: uuid('store_id')
            .notNull()
            .references(() => stores.id, { onDelete: 'cascade' }),
        orderId: uuid('order_id')
            .notNull()
            .references(() => orders.id, { onDelete: 'cascade' }),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'restrict' }),
        quantity: integer('quantity').notNull().default(1),
        unitPriceInCents: integer('unit_price_in_cents').notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => ({
        storeIdx: index('order_items_store_id_idx').on(table.storeId),
        orderIdx: index('order_items_order_id_idx').on(table.orderId),
        productIdx: index('order_items_product_id_idx').on(table.productId),
    })
);