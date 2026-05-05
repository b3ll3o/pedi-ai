-- ===================================================================
-- MIGRATION: Fix RLS Policies to use helper functions
-- Purpose: Fix policies that use current_setting() directly to use
--          get_current_restaurant_id() function instead
-- ===================================================================

-- ===================================================================
-- STEP 1: Create helper functions (if not exists)
-- ===================================================================

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

CREATE OR REPLACE FUNCTION set_current_restaurant_id(restaurant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('search_path', 'pg_catalog, public', true);
    PERFORM set_config('app.current_restaurant_id', restaurant_uuid::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- STEP 2: Recreate RLS policies using helper function
-- ===================================================================

-- Categories
DROP POLICY IF EXISTS "Users can read categories of their restaurant" ON categories;
CREATE POLICY "Users can read categories of their restaurant"
  ON categories FOR SELECT
  USING (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Authenticated users can create categories for their restaurant" ON categories;
CREATE POLICY "Authenticated users can create categories for their restaurant"
  ON categories FOR INSERT
  WITH CHECK (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Managers and owners can update categories" ON categories;
CREATE POLICY "Managers and owners can update categories"
  ON categories FOR UPDATE
  USING (
    restaurant_id = get_current_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM users_profiles
      WHERE user_id = auth.uid()
      AND restaurant_id = categories.restaurant_id
      AND role = ANY (ARRAY['dono'::user_role, 'gerente'::user_role])
    )
  );

DROP POLICY IF EXISTS "Managers and owners can delete categories" ON categories;
CREATE POLICY "Managers and owners can delete categories"
  ON categories FOR DELETE
  USING (
    restaurant_id = get_current_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM users_profiles
      WHERE user_id = auth.uid()
      AND restaurant_id = categories.restaurant_id
      AND role = ANY (ARRAY['dono'::user_role, 'gerente'::user_role])
    )
  );

-- Products
DROP POLICY IF EXISTS "Users can read products of their restaurant" ON products;
CREATE POLICY "Users can read products of their restaurant"
  ON products FOR SELECT
  USING (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Managers and owners can create products" ON products;
CREATE POLICY "Managers and owners can create products"
  ON products FOR INSERT
  WITH CHECK (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Managers and owners can update products" ON products;
CREATE POLICY "Managers and owners can update products"
  ON products FOR UPDATE
  USING (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Managers and owners can delete products" ON products;
CREATE POLICY "Managers and owners can delete products"
  ON products FOR DELETE
  USING (restaurant_id = get_current_restaurant_id());

-- Modifier Groups
DROP POLICY IF EXISTS "Users can read modifier groups of their restaurant" ON modifier_groups;
CREATE POLICY "Users can read modifier groups of their restaurant"
  ON modifier_groups FOR SELECT
  USING (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Users can create modifier groups for their restaurant" ON modifier_groups;
CREATE POLICY "Users can create modifier groups for their restaurant"
  ON modifier_groups FOR INSERT
  WITH CHECK (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Users can update modifier groups of their restaurant" ON modifier_groups;
CREATE POLICY "Users can update modifier groups of their restaurant"
  ON modifier_groups FOR UPDATE
  USING (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Users can delete modifier groups of their restaurant" ON modifier_groups;
CREATE POLICY "Users can delete modifier groups of their restaurant"
  ON modifier_groups FOR DELETE
  USING (restaurant_id = get_current_restaurant_id());

-- Modifier Values
DROP POLICY IF EXISTS "Users can read modifier values of their restaurant" ON modifier_values;
CREATE POLICY "Users can read modifier values of their restaurant"
  ON modifier_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM modifier_groups
      WHERE modifier_groups.id = modifier_values.modifier_group_id
      AND modifier_groups.restaurant_id = get_current_restaurant_id()
    )
  );

DROP POLICY IF EXISTS "Users can create modifier values for their restaurant" ON modifier_values;
CREATE POLICY "Users can create modifier values for their restaurant"
  ON modifier_values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM modifier_groups
      WHERE modifier_groups.id = modifier_values.modifier_group_id
      AND modifier_groups.restaurant_id = get_current_restaurant_id()
    )
  );

DROP POLICY IF EXISTS "Users can update modifier values of their restaurant" ON modifier_values;
CREATE POLICY "Users can update modifier values of their restaurant"
  ON modifier_values FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM modifier_groups
      WHERE modifier_groups.id = modifier_values.modifier_group_id
      AND modifier_groups.restaurant_id = get_current_restaurant_id()
    )
  );

DROP POLICY IF EXISTS "Users can delete modifier values of their restaurant" ON modifier_values;
CREATE POLICY "Users can delete modifier values of their restaurant"
  ON modifier_values FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM modifier_groups
      WHERE modifier_groups.id = modifier_values.modifier_group_id
      AND modifier_groups.restaurant_id = get_current_restaurant_id()
    )
  );

-- Combos
DROP POLICY IF EXISTS "Users can read combos of their restaurant" ON combos;
CREATE POLICY "Users can read combos of their restaurant"
  ON combos FOR SELECT
  USING (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Users can create combos for their restaurant" ON combos;
CREATE POLICY "Users can create combos for their restaurant"
  ON combos FOR INSERT
  WITH CHECK (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Users can update combos of their restaurant" ON combos;
CREATE POLICY "Users can update combos of their restaurant"
  ON combos FOR UPDATE
  USING (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Users can delete combos of their restaurant" ON combos;
CREATE POLICY "Users can delete combos of their restaurant"
  ON combos FOR DELETE
  USING (restaurant_id = get_current_restaurant_id());

-- Combo Items
DROP POLICY IF EXISTS "Users can read combo items of their restaurant" ON combo_items;
CREATE POLICY "Users can read combo items of their restaurant"
  ON combo_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.restaurant_id = get_current_restaurant_id()
    )
  );

DROP POLICY IF EXISTS "Users can create combo items for their restaurant" ON combo_items;
CREATE POLICY "Users can create combo items for their restaurant"
  ON combo_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.restaurant_id = get_current_restaurant_id()
    )
  );

DROP POLICY IF EXISTS "Users can update combo items of their restaurant" ON combo_items;
CREATE POLICY "Users can update combo items of their restaurant"
  ON combo_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.restaurant_id = get_current_restaurant_id()
    )
  );

DROP POLICY IF EXISTS "Users can delete combo items of their restaurant" ON combo_items;
CREATE POLICY "Users can delete combo items of their restaurant"
  ON combo_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.restaurant_id = get_current_restaurant_id()
    )
  );

-- Orders
DROP POLICY IF EXISTS "Customers can read own orders, staff can read restaurant orders" ON orders;
CREATE POLICY "Customers can read own orders, staff can read restaurant orders"
  ON orders FOR SELECT
  USING (
    (restaurant_id = get_current_restaurant_id())
    OR (customer_id IS NOT NULL AND customer_id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Authenticated customers can create orders" ON orders;
CREATE POLICY "Authenticated customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    (customer_id IS NOT NULL AND table_id IS NOT NULL)
    OR (restaurant_id = get_current_restaurant_id())
  );

DROP POLICY IF EXISTS "Staff can update orders of their restaurant" ON orders;
CREATE POLICY "Staff can update orders of their restaurant"
  ON orders FOR UPDATE
  USING (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Staff can delete orders of their restaurant" ON orders;
CREATE POLICY "Staff can delete orders of their restaurant"
  ON orders FOR DELETE
  USING (restaurant_id = get_current_restaurant_id());

-- Order Items
DROP POLICY IF EXISTS "Users can read order items of their restaurant" ON order_items;
CREATE POLICY "Users can read order items of their restaurant"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = get_current_restaurant_id()
    )
  );

DROP POLICY IF EXISTS "Users can create order items for their restaurant" ON order_items;
CREATE POLICY "Users can create order items for their restaurant"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = get_current_restaurant_id()
    )
  );

DROP POLICY IF EXISTS "Users can update order items of their restaurant" ON order_items;
CREATE POLICY "Users can update order items of their restaurant"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = get_current_restaurant_id()
    )
  );

DROP POLICY IF EXISTS "Users can delete order items of their restaurant" ON order_items;
CREATE POLICY "Users can delete order items of their restaurant"
  ON order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = get_current_restaurant_id()
    )
  );

-- Order Status History
DROP POLICY IF EXISTS "Users can read order status history of their restaurant" ON order_status_history;
CREATE POLICY "Users can read order status history of their restaurant"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND orders.restaurant_id = get_current_restaurant_id()
    )
  );

DROP POLICY IF EXISTS "Staff can create order status history" ON order_status_history;
CREATE POLICY "Staff can create order status history"
  ON order_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND orders.restaurant_id = get_current_restaurant_id()
    )
  );

-- Tables
DROP POLICY IF EXISTS "Users can read tables of their restaurant" ON tables;
CREATE POLICY "Users can read tables of their restaurant"
  ON tables FOR SELECT
  USING (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Users can create tables for their restaurant" ON tables;
CREATE POLICY "Users can create tables for their restaurant"
  ON tables FOR INSERT
  WITH CHECK (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Users can update tables of their restaurant" ON tables;
CREATE POLICY "Users can update tables of their restaurant"
  ON tables FOR UPDATE
  USING (restaurant_id = get_current_restaurant_id());

DROP POLICY IF EXISTS "Users can delete tables of their restaurant" ON tables;
CREATE POLICY "Users can delete tables of their restaurant"
  ON tables FOR DELETE
  USING (restaurant_id = get_current_restaurant_id());

-- ===================================================================
-- COMPLETE
-- ===================================================================
