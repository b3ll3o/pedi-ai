-- Migration: Create tables table
-- Restaurant tables for QR code ordering

COMMENT ON TABLE tables IS 'Restaurant tables linked to QR codes for mobile ordering';

CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    qr_code TEXT UNIQUE,
    name VARCHAR(100),
    capacity INTEGER DEFAULT 4,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, number)
);

CREATE INDEX idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX idx_tables_qr_code ON tables(qr_code);
