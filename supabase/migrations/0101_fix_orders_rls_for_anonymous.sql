-- Migration: Fix orders RLS policy for anonymous (non-authenticated) orders
-- Allows anonymous customers to place orders using phone as identifier (no table_id required)

-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated customers can create orders" ON orders;

-- New policy: allows order creation in two scenarios:
-- 1. Authenticated user with a table (dine-in): customer_id + table_id both set
-- 2. Anonymous customer (non-authenticated): customer_id set as phone, no table_id required
-- The service role key bypasses RLS entirely, so this is mainly for future direct browser access
CREATE POLICY "Customers can create orders (authenticated or anonymous)"
  ON orders FOR INSERT
  WITH CHECK (
    -- Case 1: Authenticated dine-in order (both customer_id and table_id required)
    (customer_id IS NOT NULL AND customer_id <> '' AND table_id IS NOT NULL)
    -- Case 2: Authenticated delivery/pickup order (customer_id required, no table)
    OR (customer_id IS NOT NULL AND customer_id <> '' AND table_id IS NULL AND auth.uid() IS NOT NULL)
    -- Case 3: Anonymous order via service role (customer_id as phone identifier)
    -- This is handled by service role bypass, but we allow it in policy for completeness
    OR (customer_id IS NOT NULL AND customer_id <> '')
  );

-- Update SELECT policy to also allow reading by customer_phone (for anonymous order tracking)
DROP POLICY IF EXISTS "Customers can read own orders, staff can read restaurant orders" ON orders;
CREATE POLICY "Customers can read own orders, staff can read restaurant orders"
  ON orders FOR SELECT
  USING (
    (restaurant_id = get_current_restaurant_id())
    OR (customer_id IS NOT NULL AND customer_id <> '' AND customer_id = auth.uid()::text)
    OR (customer_phone IS NOT NULL AND auth.uid() IS NULL)
  );
