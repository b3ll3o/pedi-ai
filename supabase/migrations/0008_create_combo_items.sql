-- Migration: Create combo_items table
-- Products included in a combo

COMMENT ON TABLE combo_items IS 'Products included in a combo with quantity';

CREATE TABLE combo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_combo_items_combo_id ON combo_items(combo_id);
CREATE INDEX idx_combo_items_product_id ON combo_items(product_id);
