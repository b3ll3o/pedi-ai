-- Migration: Create modifier_values table
-- Individual modifier options within a group

COMMENT ON TABLE modifier_values IS 'Individual modifier options with price adjustments';

CREATE TABLE modifier_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price_adjustment NUMERIC(10, 2) DEFAULT 0,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modifier_values_group_id ON modifier_values(modifier_group_id);
