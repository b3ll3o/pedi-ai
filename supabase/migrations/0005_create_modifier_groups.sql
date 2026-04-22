-- Migration: Create modifier_groups table
-- Groups of modifiers for product customization

CREATE TABLE modifier_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE modifier_groups IS 'Modifier groups defining selection rules for product options';

CREATE INDEX idx_modifier_groups_restaurant_id ON modifier_groups(restaurant_id);
