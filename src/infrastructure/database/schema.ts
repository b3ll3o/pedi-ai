// ============================================================
// Drizzle Schema — espelho do Supabase para dev local
// ============================================================

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ── Enums (como text no SQLite) ─────────────────────────────

export const orderStatusEnum = [
  'pending_payment',
  'paid',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof orderStatusEnum)[number];

export const paymentMethodEnum = ['cash', 'credit_card', 'debit_card', 'pix', 'other'] as const;
export type PaymentMethod = (typeof paymentMethodEnum)[number];

export const paymentStatusEnum = ['pending', 'paid', 'refunded', 'failed'] as const;
export type PaymentStatus = (typeof paymentStatusEnum)[number];

export const userRoleEnum = ['dono', 'gerente', 'atendente', 'cliente'] as const;
export type UserRole = (typeof userRoleEnum)[number];

// ── Tables ───────────────────────────────────────────────────

export const restaurants = sqliteTable('restaurants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug'),
  description: text('description'),
  address: text('address'),
  phone: text('phone'),
  logo_url: text('logo_url'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
});

export const tables = sqliteTable('tables', {
  id: text('id').primaryKey(),
  restaurant_id: text('restaurant_id').notNull().references(() => restaurants.id),
  number: integer('number').notNull(),
  qr_code: text('qr_code'),
  name: text('name'),
  capacity: integer('capacity'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  restaurant_id: text('restaurant_id').notNull().references(() => restaurants.id),
  name: text('name').notNull(),
  description: text('description'),
  image_url: text('image_url'),
  sort_order: integer('sort_order').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  deleted_at: text('deleted_at'),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  category_id: text('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  image_url: text('image_url'),
  price: real('price').notNull(),
  dietary_labels: text('dietary_labels', { mode: 'json' }).$type<string[]>(),
  available: integer('available', { mode: 'boolean' }).notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
});

export const modifierGroups = sqliteTable('modifier_groups', {
  id: text('id').primaryKey(),
  restaurant_id: text('restaurant_id').notNull().references(() => restaurants.id),
  name: text('name').notNull(),
  required: integer('required', { mode: 'boolean' }).notNull().default(false),
  min_selections: integer('min_selections').notNull().default(0),
  max_selections: integer('max_selections').notNull().default(1),
  created_at: text('created_at').notNull().default(''),
});

export const modifierValues = sqliteTable('modifier_values', {
  id: text('id').primaryKey(),
  modifier_group_id: text('modifier_group_id')
    .notNull()
    .references(() => modifierGroups.id),
  name: text('name').notNull(),
  price_adjustment: real('price_adjustment').notNull().default(0),
  available: integer('available', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(''),
});

export const combos = sqliteTable('combos', {
  id: text('id').primaryKey(),
  restaurant_id: text('restaurant_id').notNull().references(() => restaurants.id),
  name: text('name').notNull(),
  description: text('description'),
  bundle_price: real('bundle_price').notNull(),
  image_url: text('image_url'),
  available: integer('available', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
});

export const comboItems = sqliteTable('combo_items', {
  id: text('id').primaryKey(),
  combo_id: text('combo_id').notNull().references(() => combos.id),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull().default(1),
  created_at: text('created_at').notNull().default(''),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  restaurant_id: text('restaurant_id').notNull().references(() => restaurants.id),
  table_id: text('table_id'),
  customer_id: text('customer_id'),
  customer_phone: text('customer_phone'),
  customer_name: text('customer_name'),
  status: text('status').$type<OrderStatus>().notNull().default('pending_payment'),
  subtotal: real('subtotal').notNull(),
  tax: real('tax').notNull(),
  total: real('total').notNull(),
  payment_method: text('payment_method').$type<PaymentMethod>(),
  payment_status: text('payment_status').$type<PaymentStatus>().notNull().default('pending'),
  idempotency_key: text('idempotency_key'),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id),
  combo_id: text('combo_id'),
  quantity: integer('quantity').notNull(),
  unit_price: real('unit_price').notNull(),
  total_price: real('total_price').notNull(),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(''),
});

export const orderStatusHistory = sqliteTable('order_status_history', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id),
  status: text('status').$type<OrderStatus>().notNull(),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(''),
});

export const usersProfiles = sqliteTable('users_profiles', {
  id: text('id').primaryKey(),
  user_id: text('user_id'),
  restaurant_id: text('restaurant_id').references(() => restaurants.id),
  role: text('role').$type<UserRole>().notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  password_hash: text('password_hash'),
  created_at: text('created_at').notNull().default(''),
});

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => usersProfiles.user_id),
  token: text('token').notNull().unique(),
  expires_at: text('expires_at').notNull(),
  used: integer('used', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull().default(''),
});

export const paymentIntents = sqliteTable('payment_intents', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id),
  restaurant_id: text('restaurant_id').notNull().references(() => restaurants.id),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('BRL'),
  status: text('status').$type<PaymentStatus>().notNull().default('pending'),
  payment_method: text('payment_method').$type<PaymentMethod>().notNull(),
  mercado_pago_payment_id: text('mercado_pago_payment_id'),
  qr_code: text('qr_code'),
  qr_code_base64: text('qr_code_base64'),
  expires_at: text('expires_at'),
  created_at: text('created_at').notNull().default(''),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  restaurant_id: text('restaurant_id').notNull().references(() => restaurants.id),
  status: text('status').notNull(),
  plan_type: text('plan_type').notNull(),
  price_cents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('BRL'),
  trial_started_at: text('trial_started_at').notNull(),
  trial_ends_at: text('trial_ends_at').notNull(),
  trial_days: integer('trial_days').notNull(),
  subscription_started_at: text('subscription_started_at'),
  subscription_ends_at: text('subscription_ends_at'),
  cancelled_at: text('cancelled_at'),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull().default(''),
  version: integer('version').notNull().default(1),
});

// ── Junction Tables ─────────────────────────────────────────

export const productModifierGroups = sqliteTable('product_modifier_groups', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull().references(() => products.id),
  modifier_group_id: text('modifier_group_id').notNull().references(() => modifierGroups.id),
  created_at: text('created_at').notNull().default(''),
});

export const webhookEvents = sqliteTable('webhook_events', {
  id: text('id').primaryKey(),
  event_type: text('event_type').notNull(),
  processed_at: text('processed_at').notNull().default(''),
});

// ── Type exports (espelha os tipos do Supabase) ──────────────

export type Restaurant = typeof restaurants.$inferSelect;
export type RestaurantInsert = typeof restaurants.$inferInsert;
export type Table = typeof tables.$inferSelect;
export type TableInsert = typeof tables.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type ProductInsert = typeof products.$inferInsert;
export type ModifierGroup = typeof modifierGroups.$inferSelect;
export type ModifierGroupInsert = typeof modifierGroups.$inferInsert;
export type ModifierValue = typeof modifierValues.$inferSelect;
export type ModifierValueInsert = typeof modifierValues.$inferInsert;
export type Combo = typeof combos.$inferSelect;
export type ComboInsert = typeof combos.$inferInsert;
export type ComboItem = typeof comboItems.$inferSelect;
export type ComboItemInsert = typeof comboItems.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type OrderInsert = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderItemInsert = typeof orderItems.$inferInsert;
export type OrderStatusHistoryEntry = typeof orderStatusHistory.$inferSelect;
export type UserProfile = typeof usersProfiles.$inferSelect;
export type UserProfileInsert = typeof usersProfiles.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type PasswordResetTokenInsert = typeof passwordResetTokens.$inferInsert;
export type PaymentIntent = typeof paymentIntents.$inferSelect;
export type PaymentIntentInsert = typeof paymentIntents.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionInsert = typeof subscriptions.$inferInsert;
export type ProductModifierGroup = typeof productModifierGroups.$inferSelect;
export type ProductModifierGroupInsert = typeof productModifierGroups.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type WebhookEventInsert = typeof webhookEvents.$inferInsert;
