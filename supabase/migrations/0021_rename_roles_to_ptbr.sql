-- Migration: Renomear user_role para pt-BR e adicionar cliente
-- Renomeia: owner->dono, manager->gerente, staff->atendente
-- Adiciona: cliente

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 1: Remover TODAS as políticas RLS que referenciam user_role
-- ═══════════════════════════════════════════════════════════════════════════

-- restaurants
DROP POLICY IF EXISTS "Owners can update their restaurant" ON restaurants;
DROP POLICY IF EXISTS "Owners can delete their restaurant" ON restaurants;

-- categories
DROP POLICY IF EXISTS "Managers and owners can update categories" ON categories;
DROP POLICY IF EXISTS "Managers and owners can delete categories" ON categories;

-- users_profiles
DROP POLICY IF EXISTS "Owners can read all profiles of their restaurant" ON users_profiles;
DROP POLICY IF EXISTS "Owners can update profiles of their restaurant" ON users_profiles;

-- webhook_events
DROP POLICY IF EXISTS "Service accounts can read webhook events" ON webhook_events;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 2: Criar novo tipo temporário com valores em pt-BR
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TYPE user_role_ptbr AS ENUM ('dono', 'gerente', 'atendente', 'cliente');

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 3: Remover default e alterar coluna para novo tipo
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE users_profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE users_profiles
ALTER COLUMN role TYPE user_role_ptbr USING (
    CASE role::text
        WHEN 'owner' THEN 'dono'::user_role_ptbr
        WHEN 'manager' THEN 'gerente'::user_role_ptbr
        WHEN 'staff' THEN 'atendente'::user_role_ptbr
        ELSE 'cliente'::user_role_ptbr
    END
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 4: Adicionar novo default
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE users_profiles ALTER COLUMN role SET DEFAULT 'atendente'::user_role_ptbr;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 5: Remover tipo antigo e renomear novo
-- ═══════════════════════════════════════════════════════════════════════════
DROP TYPE user_role;
ALTER TYPE user_role_ptbr RENAME TO user_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASSO 6: Recrear políticas RLS com roles em pt-BR
-- ═══════════════════════════════════════════════════════════════════════════

-- restaurants
CREATE POLICY "Owners can update their restaurant" ON restaurants
    FOR UPDATE USING (
        id IN (
            SELECT users_profiles.restaurant_id
            FROM users_profiles
            WHERE users_profiles.user_id = auth.uid()
            AND users_profiles.role = 'dono'::user_role
        )
    );

CREATE POLICY "Owners can delete their restaurant" ON restaurants
    FOR DELETE USING (
        id IN (
            SELECT users_profiles.restaurant_id
            FROM users_profiles
            WHERE users_profiles.user_id = auth.uid()
            AND users_profiles.role = 'dono'::user_role
        )
    );

-- categories
CREATE POLICY "Managers and owners can update categories" ON categories
    FOR UPDATE USING (
        restaurant_id = (current_setting('app.current_restaurant_id', true))::uuid
        AND EXISTS (
            SELECT 1 FROM users_profiles
            WHERE users_profiles.user_id = auth.uid()
            AND users_profiles.restaurant_id = categories.restaurant_id
            AND users_profiles.role = ANY (ARRAY['dono'::user_role, 'gerente'::user_role])
        )
    );

CREATE POLICY "Managers and owners can delete categories" ON categories
    FOR DELETE USING (
        restaurant_id = (current_setting('app.current_restaurant_id', true))::uuid
        AND EXISTS (
            SELECT 1 FROM users_profiles
            WHERE users_profiles.user_id = auth.uid()
            AND users_profiles.restaurant_id = categories.restaurant_id
            AND users_profiles.role = ANY (ARRAY['dono'::user_role, 'gerente'::user_role])
        )
    );

-- users_profiles
CREATE POLICY "Owners can read all profiles of their restaurant" ON users_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'dono'::user_role
            AND up.restaurant_id = users_profiles.restaurant_id
        )
    );

CREATE POLICY "Owners can update profiles of their restaurant" ON users_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'dono'::user_role
            AND up.restaurant_id = users_profiles.restaurant_id
        )
    );

-- webhook_events
CREATE POLICY "Service accounts can read webhook events" ON webhook_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users_profiles
            WHERE users_profiles.user_id = auth.uid()
            AND users_profiles.role = ANY (ARRAY['dono'::user_role, 'gerente'::user_role])
        )
    );
