-- Migration: Create users_profiles table
-- User profiles with restaurant roles

COMMENT ON TABLE users_profiles IS 'User profiles linked to auth.users with restaurant roles';

CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff');

CREATE TABLE users_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'staff',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_profiles_user_id ON users_profiles(user_id);
CREATE INDEX idx_users_profiles_restaurant_id ON users_profiles(restaurant_id);
CREATE UNIQUE INDEX idx_users_profiles_user_id_unique ON users_profiles(user_id);
