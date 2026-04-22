-- Migration: Create products table
-- Menu products with pricing and dietary information

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
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

COMMENT ON TABLE products IS 'Menu products with prices, dietary labels, and soft delete';

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sort_order ON products(category_id, sort_order);
CREATE INDEX idx_products_available ON products(category_id, available) WHERE deleted_at IS NULL;
