-- Migration: Create orders table
-- Customer orders with payment tracking

COMMENT ON TABLE orders IS 'Customer orders with payment and status tracking';

CREATE TYPE order_status AS ENUM ('pending_payment', 'paid', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE payment_method AS ENUM ('pix', 'card');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    customer_id VARCHAR(255),
    status order_status DEFAULT 'pending_payment',
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_method payment_method,
    payment_status payment_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
