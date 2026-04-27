-- Migration: Create user_restaurants junction table for N:N relationship
-- Replaces unique constraint in users_profiles

CREATE TABLE user_restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'staff', -- owner, manager, staff
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id)
);

COMMENT ON TABLE user_restaurants IS 'Junction table for N:N user-restaurant relationships with per-restaurant roles';

CREATE INDEX idx_user_restaurants_user_id ON user_restaurants(user_id);
CREATE INDEX idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);
CREATE INDEX idx_user_restaurants_role ON user_restaurants(role);