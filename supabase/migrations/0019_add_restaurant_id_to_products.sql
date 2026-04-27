-- Migration: Add restaurant_id to products table for multi-restaurant support
-- Products already link via category_id, this adds direct restaurant_id for query efficiency

ALTER TABLE products ADD COLUMN restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

-- Backfill restaurant_id from category relationship
UPDATE products SET restaurant_id = categories.restaurant_id 
FROM categories 
WHERE products.category_id = categories.id;

-- Make column NOT NULL after backfill
ALTER TABLE products ALTER COLUMN restaurant_id SET NOT NULL;

-- Add index for direct restaurant queries
CREATE INDEX idx_products_restaurant_id ON products(restaurant_id);