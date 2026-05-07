-- Migration: Add customer_phone to orders for anonymous customer identification
-- Supports non-authenticated users placing orders with phone as contact

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

COMMENT ON COLUMN orders.customer_phone IS 'Phone number for anonymous customers (non-authenticated orders)';
COMMENT ON COLUMN orders.customer_name IS 'Name for anonymous customers (non-authenticated orders)';
