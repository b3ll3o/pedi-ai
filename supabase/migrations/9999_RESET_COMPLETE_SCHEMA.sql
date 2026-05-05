-- ===================================================================
-- CONSOLIDATED MIGRATION: Full Database Reset and Recreation
-- Project: Pedi-AI
-- Purpose: Recreate entire database schema from scratch
-- ===================================================================

-- ===================================================================
-- STEP 1: DROP ALL EXISTING OBJECTS
-- ===================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop existing policies first (to avoid dependency issues)
    FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;

    -- Drop existing tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', r.tablename);
    END LOOP;

    -- Drop existing types (enums)
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e') LOOP
        EXECUTE format('DROP TYPE IF EXISTS %I', r.typname);
    END LOOP;

    -- Drop existing functions
    FOR r IN (SELECT proname, oid FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s', r.oid::regprocedure);
    END LOOP;
END $$;

-- ===================================================================
-- STEP 2: CREATE EXTENSIONS
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- STEP 3: CREATE ENUMS
-- ===================================================================

CREATE TYPE order_status AS ENUM ('pending_payment', 'paid', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE payment_method AS ENUM ('pix', 'card');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE user_role AS ENUM ('dono', 'gerente', 'atendente', 'cliente');

-- ===================================================================
-- STEP 4: CREATE TABLES
-- ===================================================================

-- restaurants table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    phone VARCHAR(50),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_restaurants_name ON restaurants(name);

-- tables (qr code enabled tables)
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    qr_code TEXT UNIQUE,
    name VARCHAR(100),
    capacity INTEGER DEFAULT 4,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, number)
);
CREATE INDEX idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX idx_tables_qr_code ON tables(qr_code);

-- categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_categories_restaurant_id ON categories(restaurant_id);
CREATE INDEX idx_categories_sort_order ON categories(restaurant_id, sort_order);
CREATE INDEX idx_categories_active ON categories(restaurant_id, active) WHERE deleted_at IS NULL;

-- products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    dietary_labels TEXT[] DEFAULT '{}',
    available BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_restaurant_id ON products(restaurant_id);
CREATE INDEX idx_products_sort_order ON products(category_id, sort_order);
CREATE INDEX idx_products_available ON products(category_id, available) WHERE deleted_at IS NULL;

-- modifier_groups
CREATE TABLE modifier_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_modifier_groups_restaurant_id ON modifier_groups(restaurant_id);

-- modifier_values
CREATE TABLE modifier_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price_adjustment NUMERIC(10, 2) DEFAULT 0,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_modifier_values_group_id ON modifier_values(modifier_group_id);

-- combos
CREATE TABLE combos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    bundle_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    image_url TEXT,
    available BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_combos_restaurant_id ON combos(restaurant_id);
CREATE INDEX idx_combos_available ON combos(restaurant_id, available) WHERE deleted_at IS NULL;

-- combo_items
CREATE TABLE combo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_combo_items_combo_id ON combo_items(combo_id);
CREATE INDEX idx_combo_items_product_id ON combo_items(product_id);

-- orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    customer_id VARCHAR(255),
    status order_status DEFAULT 'pending_payment',
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_method payment_method,
    payment_status payment_status DEFAULT 'pending',
    idempotency_key VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_idempotency ON orders(customer_id, idempotency_key);

-- order_items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    combo_id UUID REFERENCES combos(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- order_status_history
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status order_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at);

-- users_profiles
CREATE TABLE users_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'atendente',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_profiles_user_id ON users_profiles(user_id);
CREATE INDEX idx_users_profiles_restaurant_id ON users_profiles(restaurant_id);

-- user_restaurants (N:N junction)
CREATE TABLE user_restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id)
);
CREATE INDEX idx_user_restaurants_user_id ON user_restaurants(user_id);
CREATE INDEX idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);
CREATE INDEX idx_user_restaurants_role ON user_restaurants(role);

-- webhook_events (idempotency)
CREATE TABLE webhook_events (
    id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at);

-- ===================================================================
-- STEP 5: CREATE HELPER FUNCTIONS FOR MULTI-TENANT
-- ===================================================================

-- Function to safely get current restaurant ID
CREATE OR REPLACE FUNCTION get_current_restaurant_id()
RETURNS UUID AS $$
DECLARE
    restaurant_uuid UUID;
BEGIN
    PERFORM set_config('search_path', 'pg_catalog, public', true);
    BEGIN
        restaurant_uuid := NULLIF(current_setting('app.current_restaurant_id', true), '')::UUID;
        IF restaurant_uuid IS NULL THEN
            restaurant_uuid := '00000000-0000-0000-0000-000000000001'::UUID;
        END IF;
        RETURN restaurant_uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN '00000000-0000-0000-0000-000000000001'::UUID;
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to set current restaurant ID for a session
CREATE OR REPLACE FUNCTION set_current_restaurant_id(restaurant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('search_path', 'pg_catalog, public', true);
    PERFORM set_config('app.current_restaurant_id', restaurant_uuid::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ===================================================================

-- restaurants
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their restaurant" ON restaurants FOR SELECT USING (
    id IN (SELECT restaurant_id FROM users_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Owners can update their restaurant" ON restaurants FOR UPDATE USING (
    id IN (SELECT restaurant_id FROM users_profiles WHERE user_id = auth.uid() AND role = 'dono'::user_role)
);
CREATE POLICY "Owners can delete their restaurant" ON restaurants FOR DELETE USING (
    id IN (SELECT restaurant_id FROM users_profiles WHERE user_id = auth.uid() AND role = 'dono'::user_role)
);

-- tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read tables of their restaurant" ON tables FOR SELECT USING (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Users can create tables for their restaurant" ON tables FOR INSERT WITH CHECK (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Users can update tables of their restaurant" ON tables FOR UPDATE USING (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Users can delete tables of their restaurant" ON tables FOR DELETE USING (
    restaurant_id = get_current_restaurant_id()
);

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read categories of their restaurant" ON categories FOR SELECT USING (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Authenticated users can create categories for their restaurant" ON categories FOR INSERT WITH CHECK (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Managers and owners can update categories" ON categories FOR UPDATE USING (
    restaurant_id = get_current_restaurant_id()
    AND EXISTS (
        SELECT 1 FROM users_profiles
        WHERE user_id = auth.uid()
        AND restaurant_id = categories.restaurant_id
        AND role = ANY (ARRAY['dono'::user_role, 'gerente'::user_role])
    )
);
CREATE POLICY "Managers and owners can delete categories" ON categories FOR DELETE USING (
    restaurant_id = get_current_restaurant_id()
    AND EXISTS (
        SELECT 1 FROM users_profiles
        WHERE user_id = auth.uid()
        AND restaurant_id = categories.restaurant_id
        AND role = ANY (ARRAY['dono'::user_role, 'gerente'::user_role])
    )
);

-- products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read products of their restaurant" ON products FOR SELECT USING (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Managers and owners can create products" ON products FOR INSERT WITH CHECK (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Managers and owners can update products" ON products FOR UPDATE USING (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Managers and owners can delete products" ON products FOR DELETE USING (
    restaurant_id = get_current_restaurant_id()
);

-- modifier_groups
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read modifier groups of their restaurant" ON modifier_groups FOR SELECT USING (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Users can create modifier groups for their restaurant" ON modifier_groups FOR INSERT WITH CHECK (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Users can update modifier groups of their restaurant" ON modifier_groups FOR UPDATE USING (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Users can delete modifier groups of their restaurant" ON modifier_groups FOR DELETE USING (
    restaurant_id = get_current_restaurant_id()
);

-- modifier_values
ALTER TABLE modifier_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read modifier values of their restaurant" ON modifier_values FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM modifier_groups
        WHERE modifier_groups.id = modifier_values.modifier_group_id
        AND modifier_groups.restaurant_id = get_current_restaurant_id()
    )
);
CREATE POLICY "Users can create modifier values for their restaurant" ON modifier_values FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM modifier_groups
        WHERE modifier_groups.id = modifier_values.modifier_group_id
        AND modifier_groups.restaurant_id = get_current_restaurant_id()
    )
);
CREATE POLICY "Users can update modifier values of their restaurant" ON modifier_values FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM modifier_groups
        WHERE modifier_groups.id = modifier_values.modifier_group_id
        AND modifier_groups.restaurant_id = get_current_restaurant_id()
    )
);
CREATE POLICY "Users can delete modifier values of their restaurant" ON modifier_values FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM modifier_groups
        WHERE modifier_groups.id = modifier_values.modifier_group_id
        AND modifier_groups.restaurant_id = get_current_restaurant_id()
    )
);

-- combos
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read combos of their restaurant" ON combos FOR SELECT USING (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Users can create combos for their restaurant" ON combos FOR INSERT WITH CHECK (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Users can update combos of their restaurant" ON combos FOR UPDATE USING (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Users can delete combos of their restaurant" ON combos FOR DELETE USING (
    restaurant_id = get_current_restaurant_id()
);

-- combo_items
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read combo items of their restaurant" ON combo_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM combos
        WHERE combos.id = combo_items.combo_id
        AND combos.restaurant_id = get_current_restaurant_id()
    )
);
CREATE POLICY "Users can create combo items for their restaurant" ON combo_items FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM combos
        WHERE combos.id = combo_items.combo_id
        AND combos.restaurant_id = get_current_restaurant_id()
    )
);
CREATE POLICY "Users can update combo items of their restaurant" ON combo_items FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM combos
        WHERE combos.id = combo_items.combo_id
        AND combos.restaurant_id = get_current_restaurant_id()
    )
);
CREATE POLICY "Users can delete combo items of their restaurant" ON combo_items FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM combos
        WHERE combos.id = combo_items.combo_id
        AND combos.restaurant_id = get_current_restaurant_id()
    )
);

-- orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can read own orders, staff can read restaurant orders" ON orders FOR SELECT USING (
    (restaurant_id = get_current_restaurant_id())
    OR (customer_id IS NOT NULL AND customer_id = auth.uid()::text)
);
CREATE POLICY "Authenticated customers can create orders" ON orders FOR INSERT WITH CHECK (
    (customer_id IS NOT NULL AND table_id IS NOT NULL)
    OR (restaurant_id = get_current_restaurant_id())
);
CREATE POLICY "Staff can update orders of their restaurant" ON orders FOR UPDATE USING (
    restaurant_id = get_current_restaurant_id()
);
CREATE POLICY "Staff can delete orders of their restaurant" ON orders FOR DELETE USING (
    restaurant_id = get_current_restaurant_id()
);

-- order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read order items of their restaurant" ON order_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND orders.restaurant_id = get_current_restaurant_id()
    )
);
CREATE POLICY "Users can create order items for their restaurant" ON order_items FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND orders.restaurant_id = get_current_restaurant_id()
    )
);
CREATE POLICY "Users can update order items of their restaurant" ON order_items FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND orders.restaurant_id = get_current_restaurant_id()
    )
);
CREATE POLICY "Users can delete order items of their restaurant" ON order_items FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND orders.restaurant_id = get_current_restaurant_id()
    )
);

-- order_status_history
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read order status history of their restaurant" ON order_status_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_status_history.order_id
        AND orders.restaurant_id = get_current_restaurant_id()
    )
);
CREATE POLICY "Staff can create order status history" ON order_status_history FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_status_history.order_id
        AND orders.restaurant_id = get_current_restaurant_id()
    )
);

-- users_profiles
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own profile" ON users_profiles FOR SELECT USING (
    user_id = auth.uid()
);
CREATE POLICY "Owners can read all profiles of their restaurant" ON users_profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users_profiles AS up
        WHERE up.user_id = auth.uid()
        AND up.role = 'dono'::user_role
        AND up.restaurant_id = users_profiles.restaurant_id
    )
);
CREATE POLICY "Users can update their own profile" ON users_profiles FOR UPDATE USING (
    user_id = auth.uid()
);
CREATE POLICY "Owners can update profiles of their restaurant" ON users_profiles FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM users_profiles AS up
        WHERE up.user_id = auth.uid()
        AND up.role = 'dono'::user_role
        AND up.restaurant_id = users_profiles.restaurant_id
    )
);

-- webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage webhook events" ON webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service accounts can read webhook events" ON webhook_events FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM users_profiles
        WHERE user_id = auth.uid()
        AND role = ANY (ARRAY['dono'::user_role, 'gerente'::user_role])
    )
);

-- ===================================================================
-- STEP 7: CREATE DEFAULT RESTAURANT FOR E2E TESTS
-- ===================================================================

INSERT INTO restaurants (id, name, description, address, phone, settings)
VALUES ('00000000-0000-0000-0000-000000000001', 'Restaurant E2E Test', 'Restaurant for E2E testing', '123 Test St', '+5511999999999', '{}');

-- ===================================================================
-- COMPLETE
-- ===================================================================
