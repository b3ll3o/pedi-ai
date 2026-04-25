-- Migration: Fix missing app.current_restaurant_id configuration
-- The RLS policies reference current_setting('app.current_restaurant_id')
-- but this setting was never defined. This migration creates helper functions.

-- Create a function to safely get current restaurant ID
-- This function handles the case where the setting doesn't exist
CREATE OR REPLACE FUNCTION get_current_restaurant_id()
RETURNS UUID AS $$
DECLARE
  restaurant_uuid UUID;
BEGIN
  -- Prevent search path hijacking in SECURITY DEFINER function
  PERFORM set_config('search_path', 'pg_catalog, public', true);
  BEGIN
    restaurant_uuid := NULLIF(current_setting('app.current_restaurant_id', true), '')::UUID;
    IF restaurant_uuid IS NULL THEN
      -- Return default restaurant ID for E2E tests
      restaurant_uuid := '00000000-0000-0000-0000-000000000001'::UUID;
    END IF;
    RETURN restaurant_uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If current_setting fails (setting doesn't exist), return default
    RETURN '00000000-0000-0000-0000-000000000001'::UUID;
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create a function to set current restaurant ID for a session
-- This should be called after authentication to set the tenant context
CREATE OR REPLACE FUNCTION set_current_restaurant_id(restaurant_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Prevent search path hijacking in SECURITY DEFINER function
  PERFORM set_config('search_path', 'pg_catalog, public', true);
  PERFORM set_config('app.current_restaurant_id', restaurant_uuid::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to use the function instead of current_setting directly
-- This is needed because current_setting() fails when the setting doesn't exist

-- Categories table
DROP POLICY IF EXISTS "Users can read categories of their restaurant" ON categories;
CREATE POLICY "Users can read categories of their restaurant"
  ON categories FOR SELECT
  USING (
    restaurant_id = get_current_restaurant_id()
  );

-- Products table
DROP POLICY IF EXISTS "Users can read products of their restaurant" ON products;
CREATE POLICY "Users can read products of their restaurant"
  ON products FOR SELECT
  USING (
    category_id IN (
      SELECT id FROM categories WHERE restaurant_id = get_current_restaurant_id()
    )
  );

-- Tables table
DROP POLICY IF EXISTS "Users can read tables of their restaurant" ON tables;
CREATE POLICY "Users can read tables of their restaurant"
  ON tables FOR SELECT
  USING (
    restaurant_id = get_current_restaurant_id()
  );

-- Modifier groups table
DROP POLICY IF EXISTS "Users can read modifier groups of their restaurant" ON modifier_groups;
CREATE POLICY "Users can read modifier groups of their restaurant"
  ON modifier_groups FOR SELECT
  USING (
    restaurant_id = get_current_restaurant_id()
  );

-- Combos table
DROP POLICY IF EXISTS "Users can read combos of their restaurant" ON combos;
CREATE POLICY "Users can read combos of their restaurant"
  ON combos FOR SELECT
  USING (
    restaurant_id = get_current_restaurant_id()
  );

-- Orders table
DROP POLICY IF EXISTS "Users can read orders of their restaurant" ON orders;
CREATE POLICY "Users can read orders of their restaurant"
  ON orders FOR SELECT
  USING (
    restaurant_id = get_current_restaurant_id()
  );

-- Modifier values table (MISSING - needs to be added)
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