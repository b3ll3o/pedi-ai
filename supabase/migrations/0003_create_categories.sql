-- Migration: Create categories table
-- Product categories with soft delete support

COMMENT ON TABLE categories IS 'Product categories with sort ordering and soft delete';

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
