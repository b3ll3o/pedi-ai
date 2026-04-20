-- Migration: Add idempotency_key to orders table
-- Enables duplicate order prevention

ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(255);
CREATE INDEX idx_orders_idempotency ON orders(customer_id, idempotency_key);
