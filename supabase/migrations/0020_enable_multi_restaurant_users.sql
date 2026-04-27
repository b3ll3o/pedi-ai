-- Migration: Enable multi-restaurant by removing unique constraint on users_profiles.user_id
-- This allows one user to belong to multiple restaurants via users_profiles
-- New N:N relationship is managed via user_restaurants table

DROP INDEX IF EXISTS idx_users_profiles_user_id_unique;

-- Add comment to clarify users_profiles role in multi-restaurant context
COMMENT ON TABLE users_profiles IS 'User profiles linked to auth.users with restaurant roles. Multiple rows per user allowed when using user_restaurants for N:N.';