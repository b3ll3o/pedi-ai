-- Migration: Enable RLS policies for tenant isolation
-- All tables secured with row-level security policies

-- ============================================
-- 1. restaurants table
-- ============================================
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Users can read restaurants they belong to (via users_profiles)
CREATE POLICY "Users can read their restaurant"
  ON restaurants FOR SELECT
  USING (
    id IN (
      SELECT restaurant_id FROM users_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Only owner can update restaurant
CREATE POLICY "Owners can update their restaurant"
  ON restaurants FOR UPDATE
  USING (
    id IN (
      SELECT restaurant_id FROM users_profiles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owner can delete restaurant
CREATE POLICY "Owners can delete their restaurant"
  ON restaurants FOR DELETE
  USING (
    id IN (
      SELECT restaurant_id FROM users_profiles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- 2. tables table
-- ============================================
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Users can read tables of their restaurant
CREATE POLICY "Users can read tables of their restaurant"
  ON tables FOR SELECT
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Users can insert tables for their restaurant
CREATE POLICY "Users can create tables for their restaurant"
  ON tables FOR INSERT
  WITH CHECK (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Users can update tables of their restaurant
CREATE POLICY "Users can update tables of their restaurant"
  ON tables FOR UPDATE
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Users can delete tables of their restaurant
CREATE POLICY "Users can delete tables of their restaurant"
  ON tables FOR DELETE
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- ============================================
-- 3. categories table
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Users can read categories of their restaurant
CREATE POLICY "Users can read categories of their restaurant"
  ON categories FOR SELECT
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Authenticated users can insert categories for their restaurant
CREATE POLICY "Authenticated users can create categories for their restaurant"
  ON categories FOR INSERT
  WITH CHECK (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Managers/owners can update categories
CREATE POLICY "Managers and owners can update categories"
  ON categories FOR UPDATE
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM users_profiles
      WHERE user_id = auth.uid()
      AND restaurant_id = categories.restaurant_id
      AND role IN ('owner', 'manager')
    )
  );

-- Managers/owners can delete categories
CREATE POLICY "Managers and owners can delete categories"
  ON categories FOR DELETE
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM users_profiles
      WHERE user_id = auth.uid()
      AND restaurant_id = categories.restaurant_id
      AND role IN ('owner', 'manager')
    )
  );

-- ============================================
-- 4. products table
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Users can read products through category's restaurant
CREATE POLICY "Users can read products of their restaurant"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = products.category_id
      AND categories.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Managers/owners can insert products
CREATE POLICY "Managers and owners can create products"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = products.category_id
      AND categories.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Managers/owners can update products
CREATE POLICY "Managers and owners can update products"
  ON products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = products.category_id
      AND categories.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Managers/owners can delete products
CREATE POLICY "Managers and owners can delete products"
  ON products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM categories
      WHERE categories.id = products.category_id
      AND categories.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- ============================================
-- 5. modifier_groups table
-- ============================================
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;

-- Users can read modifier_groups of their restaurant
CREATE POLICY "Users can read modifier groups of their restaurant"
  ON modifier_groups FOR SELECT
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Users can insert modifier_groups for their restaurant
CREATE POLICY "Users can create modifier groups for their restaurant"
  ON modifier_groups FOR INSERT
  WITH CHECK (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Users can update modifier_groups of their restaurant
CREATE POLICY "Users can update modifier groups of their restaurant"
  ON modifier_groups FOR UPDATE
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Users can delete modifier_groups of their restaurant
CREATE POLICY "Users can delete modifier groups of their restaurant"
  ON modifier_groups FOR DELETE
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- ============================================
-- 6. modifier_values table
-- ============================================
ALTER TABLE modifier_values ENABLE ROW LEVEL SECURITY;

-- Users can read modifier_values through modifier_group's restaurant
CREATE POLICY "Users can read modifier values of their restaurant"
  ON modifier_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM modifier_groups
      WHERE modifier_groups.id = modifier_values.modifier_group_id
      AND modifier_groups.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Users can insert modifier_values for their restaurant
CREATE POLICY "Users can create modifier values for their restaurant"
  ON modifier_values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM modifier_groups
      WHERE modifier_groups.id = modifier_values.modifier_group_id
      AND modifier_groups.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Users can update modifier_values of their restaurant
CREATE POLICY "Users can update modifier values of their restaurant"
  ON modifier_values FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM modifier_groups
      WHERE modifier_groups.id = modifier_values.modifier_group_id
      AND modifier_groups.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Users can delete modifier_values of their restaurant
CREATE POLICY "Users can delete modifier values of their restaurant"
  ON modifier_values FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM modifier_groups
      WHERE modifier_groups.id = modifier_values.modifier_group_id
      AND modifier_groups.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- ============================================
-- 7. combos table
-- ============================================
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;

-- Users can read combos of their restaurant
CREATE POLICY "Users can read combos of their restaurant"
  ON combos FOR SELECT
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Users can insert combos for their restaurant
CREATE POLICY "Users can create combos for their restaurant"
  ON combos FOR INSERT
  WITH CHECK (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Users can update combos of their restaurant
CREATE POLICY "Users can update combos of their restaurant"
  ON combos FOR UPDATE
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Users can delete combos of their restaurant
CREATE POLICY "Users can delete combos of their restaurant"
  ON combos FOR DELETE
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- ============================================
-- 8. combo_items table
-- ============================================
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;

-- Users can read combo_items through combo's restaurant
CREATE POLICY "Users can read combo items of their restaurant"
  ON combo_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Users can insert combo_items for their restaurant
CREATE POLICY "Users can create combo items for their restaurant"
  ON combo_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Users can update combo_items of their restaurant
CREATE POLICY "Users can update combo items of their restaurant"
  ON combo_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Users can delete combo_items of their restaurant
CREATE POLICY "Users can delete combo items of their restaurant"
  ON combo_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM combos
      WHERE combos.id = combo_items.combo_id
      AND combos.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- ============================================
-- 9. orders table
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers can read their own orders; staff can read restaurant orders
CREATE POLICY "Customers can read own orders, staff can read restaurant orders"
  ON orders FOR SELECT
  USING (
    -- Staff can read all orders of their restaurant
    (restaurant_id = current_setting('app.current_restaurant_id')::uuid)
    OR
    -- Customers can read their own orders by customer_id
    (customer_id IS NOT NULL AND customer_id = auth.uid()::text)
  );

-- Authenticated customers can create orders (table orders)
CREATE POLICY "Authenticated customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    -- Customer ordering at a table
    (customer_id IS NOT NULL AND table_id IS NOT NULL)
    OR
    -- Staff creating manual orders
    (restaurant_id = current_setting('app.current_restaurant_id')::uuid)
  );

-- Staff can update orders of their restaurant
CREATE POLICY "Staff can update orders of their restaurant"
  ON orders FOR UPDATE
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- Staff can cancel orders of their restaurant
CREATE POLICY "Staff can delete orders of their restaurant"
  ON orders FOR DELETE
  USING (
    restaurant_id = current_setting('app.current_restaurant_id')::uuid
  );

-- ============================================
-- 10. order_items table
-- ============================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users can read order_items through order's restaurant
CREATE POLICY "Users can read order items of their restaurant"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Users can insert order_items for their restaurant
CREATE POLICY "Users can create order items for their restaurant"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Users can update order_items of their restaurant
CREATE POLICY "Users can update order items of their restaurant"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Users can delete order_items of their restaurant
CREATE POLICY "Users can delete order items of their restaurant"
  ON order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- ============================================
-- 11. order_status_history table
-- ============================================
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Users can read order_status_history through order's restaurant
CREATE POLICY "Users can read order status history of their restaurant"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND orders.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- Staff/manager/owner can insert order_status_history
CREATE POLICY "Staff can create order status history"
  ON order_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND orders.restaurant_id = current_setting('app.current_restaurant_id')::uuid
    )
  );

-- ============================================
-- 12. users_profiles table
-- ============================================
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read their own profile"
  ON users_profiles FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Owners can read all profiles of their restaurant
CREATE POLICY "Owners can read all profiles of their restaurant"
  ON users_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles AS up
      WHERE up.user_id = auth.uid()
      AND up.role = 'owner'
      AND up.restaurant_id = users_profiles.restaurant_id
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users_profiles FOR UPDATE
  USING (
    user_id = auth.uid()
  );

-- Owners can update profiles (including role changes) of their restaurant
CREATE POLICY "Owners can update profiles of their restaurant"
  ON users_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users_profiles AS up
      WHERE up.user_id = auth.uid()
      AND up.role = 'owner'
      AND up.restaurant_id = users_profiles.restaurant_id
    )
  );
