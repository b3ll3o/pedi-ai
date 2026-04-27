-- Migration: Renomear user_role para pt-BR e adicionar cliente
-- Renomeia: owner->dono, manager->gerente, staff->atendente
-- Adiciona: cliente

-- 1. Criar novo tipo temporário com valores em pt-BR
CREATE TYPE user_role_ptbr AS ENUM ('dono', 'gerente', 'atendente', 'cliente');

-- 2. Alterar coluna para usar novo tipo (convertendo valores)
ALTER TABLE users_profiles
ALTER COLUMN role TYPE user_role_ptbr USING (
    CASE role::text
        WHEN 'owner' THEN 'dono'::user_role_ptbr
        WHEN 'manager' THEN 'gerente'::user_role_ptbr
        WHEN 'staff' THEN 'atendente'::user_role_ptbr
        ELSE 'cliente'::user_role_ptbr
    END
);

-- 3. Remover tipo antigo
DROP TYPE user_role;

-- 4. Renomear novo tipo para nome original
ALTER TYPE user_role_ptbr RENAME TO user_role;
