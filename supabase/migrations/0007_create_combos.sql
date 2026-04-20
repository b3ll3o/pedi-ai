-- Migration: Create combos table
-- Meal combos/bundles with bundle pricing

COMMENT ON TABLE combos IS 'Meal combos with bundle pricing and soft delete';

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
