-- ===================================================================
-- Migration: Adicionar colunas de soft delete e versionamento
-- PED-34: Admin account creation flow
-- ===================================================================

-- ===================================================================
-- TABELAS QUE PRECISAM DE deleted_at E version
-- ===================================================================

-- restaurants: adicionar deleted_at e version
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_deleted_at ON restaurants(deleted_at) WHERE deleted_at IS NULL;

-- tables: adicionar deleted_at e version
ALTER TABLE tables ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tables_deleted_at ON tables(deleted_at) WHERE deleted_at IS NULL;

-- modifier_groups: adicionar deleted_at e version
ALTER TABLE modifier_groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE modifier_groups ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_modifier_groups_deleted_at ON modifier_groups(deleted_at) WHERE deleted_at IS NULL;

-- modifier_values: adicionar deleted_at e version
ALTER TABLE modifier_values ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE modifier_values ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_modifier_values_deleted_at ON modifier_values(deleted_at) WHERE deleted_at IS NULL;

-- combo_items: adicionar deleted_at e version
ALTER TABLE combo_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE combo_items ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_combo_items_deleted_at ON combo_items(deleted_at) WHERE deleted_at IS NULL;

-- orders: adicionar deleted_at e version
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NULL;

-- order_items: adicionar deleted_at e version
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_deleted_at ON order_items(deleted_at) WHERE deleted_at IS NULL;

-- order_status_history: adicionar deleted_at e version
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_status_history_deleted_at ON order_status_history(deleted_at) WHERE deleted_at IS NULL;

-- users_profiles: adicionar deleted_at e version
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users_profiles ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_profiles_deleted_at ON users_profiles(deleted_at) WHERE deleted_at IS NULL;

-- user_restaurants: adicionar deleted_at e version
ALTER TABLE user_restaurants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE user_restaurants ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_restaurants_deleted_at ON user_restaurants(deleted_at) WHERE deleted_at IS NULL;

-- webhook_events: adicionar deleted_at e version
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_events_deleted_at ON webhook_events(deleted_at) WHERE deleted_at IS NULL;

-- ===================================================================
-- TABELAS QUE JÁ TEM deleted_at - ADICIONAR SÓ VERSION
-- ===================================================================

-- categories: adicionar version (já tem deleted_at)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- products: adicionar version (já tem deleted_at)
ALTER TABLE products ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- combos: adicionar version (já tem deleted_at)
ALTER TABLE combos ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- ===================================================================
-- FUNCTION: Incrementar version ao fazer update
-- ===================================================================

CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- TRIGGERS PARA AUTO-INCREMENT VERSION (apenas nas tabelas principais)
-- ===================================================================

DROP TRIGGER IF EXISTS trg_restaurants_version ON restaurants;
CREATE TRIGGER trg_restaurants_version
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_categories_version ON categories;
CREATE TRIGGER trg_categories_version
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_products_version ON products;
CREATE TRIGGER trg_products_version
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_combos_version ON combos;
CREATE TRIGGER trg_combos_version
    BEFORE UPDATE ON combos
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_tables_version ON tables;
CREATE TRIGGER trg_tables_version
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_orders_version ON orders;
CREATE TRIGGER trg_orders_version
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_modifier_groups_version ON modifier_groups;
CREATE TRIGGER trg_modifier_groups_version
    BEFORE UPDATE ON modifier_groups
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_modifier_values_version ON modifier_values;
CREATE TRIGGER trg_modifier_values_version
    BEFORE UPDATE ON modifier_values
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_combo_items_version ON combo_items;
CREATE TRIGGER trg_combo_items_version
    BEFORE UPDATE ON combo_items
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_order_items_version ON order_items;
CREATE TRIGGER trg_order_items_version
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_order_status_history_version ON order_status_history;
CREATE TRIGGER trg_order_status_history_version
    BEFORE UPDATE ON order_status_history
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_users_profiles_version ON users_profiles;
CREATE TRIGGER trg_users_profiles_version
    BEFORE UPDATE ON users_profiles
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_user_restaurants_version ON user_restaurants;
CREATE TRIGGER trg_user_restaurants_version
    BEFORE UPDATE ON user_restaurants
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_webhook_events_version ON webhook_events;
CREATE TRIGGER trg_webhook_events_version
    BEFORE UPDATE ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

-- ===================================================================
-- TABELA DE ASSINATURAS (trial e assinatura ativa)
-- ===================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'trial', -- 'trial', 'active', 'expired', 'cancelled'
    plan_type VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
    price_cents INTEGER NOT NULL DEFAULT 1999, -- R$19.99 = 1999 centavos
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    trial_started_at TIMESTAMPTZ DEFAULT NOW(),
    trial_ends_at TIMESTAMPTZ NOT NULL,
    trial_days INTEGER NOT NULL DEFAULT 14,
    subscription_started_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1 NOT NULL,
    UNIQUE(restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant_id ON subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at ON subscriptions(trial_ends_at);

-- Trigger para version increment
DROP TRIGGER IF EXISTS trg_subscriptions_version ON subscriptions;
CREATE TRIGGER trg_subscriptions_version
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

-- ===================================================================
-- COMPLETE
-- ===================================================================
