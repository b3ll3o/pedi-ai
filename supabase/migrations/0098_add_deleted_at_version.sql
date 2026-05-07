-- Migration: Add deleted_at and version fields to all entities
-- Soft-delete and optimistic concurrency control

-- restaurants: add deleted_at and version
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_restaurants_deleted_at ON restaurants(deleted_at) WHERE deleted_at IS NOT NULL;

-- tables: add deleted_at and version
ALTER TABLE tables ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_tables_deleted_at ON tables(deleted_at) WHERE deleted_at IS NOT NULL;

-- modifier_groups: add deleted_at and version
ALTER TABLE modifier_groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE modifier_groups ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_modifier_groups_deleted_at ON modifier_groups(deleted_at) WHERE deleted_at IS NOT NULL;

-- modifier_values: add deleted_at and version
ALTER TABLE modifier_values ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE modifier_values ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_modifier_values_deleted_at ON modifier_values(deleted_at) WHERE deleted_at IS NOT NULL;

-- combo_items: add deleted_at and version
ALTER TABLE combo_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE combo_items ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_combo_items_deleted_at ON combo_items(deleted_at) WHERE deleted_at IS NOT NULL;

-- orders: add deleted_at and version
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NOT NULL;

-- order_items: add deleted_at and version
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_order_items_deleted_at ON order_items(deleted_at) WHERE deleted_at IS NOT NULL;

-- users_profiles: add deleted_at and version
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_users_profiles_deleted_at ON users_profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- user_restaurants: add deleted_at and version
ALTER TABLE user_restaurants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE user_restaurants ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_user_restaurants_deleted_at ON user_restaurants(deleted_at) WHERE deleted_at IS NOT NULL;

-- Note: categories, products, and combos already have deleted_at
-- Add version to these if not present
ALTER TABLE categories ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at on tables that have it
DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_combos_updated_at ON combos;
CREATE TRIGGER update_combos_updated_at
    BEFORE UPDATE ON combos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurant_settings_updated_at ON restaurant_settings;
CREATE TRIGGER update_restaurant_settings_updated_at
    BEFORE UPDATE ON restaurant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
