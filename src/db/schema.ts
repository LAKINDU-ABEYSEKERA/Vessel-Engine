import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ------------------------------------------------------------------
// Store (tenant) table
// ------------------------------------------------------------------
export const stores = pgTable('stores', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  subdomain: text('subdomain').notNull().unique(), // tenant subdomain
  customDomain: text('custom_domain').unique(),     // optional custom domain
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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
    assetUrl: text('asset_url'), // S3/CloudFront media URL
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Strict tenant isolation: product slug unique per store
    storeSlugUnique: uniqueIndex('store_slug_unique_idx').on(
      table.storeId,
      table.slug
    ),
    storeIdx: index('products_store_id_idx').on(table.storeId),
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
    // Unique index on stripe_session_id is created automatically by .unique()
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