-- Migration: Create restaurant_settings table
-- Trial period and subscription tracking per owner

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired');

CREATE TABLE restaurant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_restaurant_created_at TIMESTAMPTZ NOT NULL,
    trial_days_remaining INTEGER NOT NULL DEFAULT 14,
    subscription_status subscription_status DEFAULT 'trial',
    monthly_price_cents INTEGER NOT NULL DEFAULT 1999, -- R$ 19,99 em centavos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE restaurant_settings IS 'Trial period and subscription management per restaurant owner';

CREATE INDEX idx_restaurant_settings_owner_id ON restaurant_settings(owner_id);
CREATE INDEX idx_restaurant_settings_status ON restaurant_settings(subscription_status);

-- RLS for restaurant_settings
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings" ON restaurant_settings FOR SELECT USING (
    owner_id = auth.uid()
);

CREATE POLICY "Users can update own settings" ON restaurant_settings FOR UPDATE USING (
    owner_id = auth.uid()
);

CREATE POLICY "Service role can manage settings" ON restaurant_settings FOR ALL USING (
    auth.jwt()->>'role' = 'service_role'
);
