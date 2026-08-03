-- Migration: add_product_restaurant_id (P0-01)
-- Data: 2026-07-29
--
-- Auditoria P0-01 (2026-07-29) — BOLA no model Product.
--
-- **Por quê:** O model `Product` não tinha `restaurant_id`, então qualquer
-- query `findMany`/`findUnique` retornava produtos cross-tenant sem warning.
-- Cliente de restaurante A conseguia ver preço/descrição de produtos do
-- restaurante B apenas informando um UUID (OWASP API #1 — BOLA).
--
-- **Correção:** adicionar coluna `restaurant_id` + index + FK, com backfill
-- idempotente derivado de `categories.restaurant_id`. Defesa em
-- profundidade: além do JOIN via `categoryId`, o model passa a ter a
-- coluna autoritativa do tenant.
--
-- **Idempotência:**
-- - `ADD COLUMN IF NOT EXISTS` permite re-execução sem erro.
-- - Backfill com `WHERE restaurant_id IS NULL` é no-op em segunda execução.
-- - `ALTER COLUMN ... SET NOT NULL` só roda após o backfill (em produção
--   em que ninguém cadastrou Product sem backfill primeiro).
-- - `CREATE INDEX IF NOT EXISTS` para o index.
-- - `DO $$ ... $$` checa `pg_constraint` antes de adicionar FK —
--   `ALTER TABLE ... ADD CONSTRAINT` não tem IF NOT EXISTS no PG16.
--
-- **Compatibilidade:** em primeira execução, a coluna é nullable para
-- acomodar linhas pré-existentes; após backfill vira NOT NULL. Em
-- re-execuções após o deploy, ambas as tentativas são no-op.
--
-- **Pre-flight guard (P0-01 MINOR #3 — 2026-07-29):** antes do
-- `SET NOT NULL`, conta quantos produtos ficaram com `restaurant_id`
-- NULL após o backfill. Se > 0, aborta com mensagem explícita —
-- normalmente significa produtos órfãos (categoria inexistente) que
-- o INNER JOIN do backfill não cobriu. Sem este guard, o deploy
-- falharia no `SET NOT NULL` com erro genérico de constraint, sem
-- indicar que o problema é o backfill incompleto.

-- ── 1. Adicionar coluna nullable (idempotente) ────────────────

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "restaurant_id" TEXT;

-- ── 2. Backfill a partir de Category.restaurant_id ──────────
-- Só preenche linhas com restaurant_id NULL — seguro para re-execução.

UPDATE "products" p
SET "restaurant_id" = c."restaurant_id"
FROM "categories" c
WHERE p."category_id" = c."id"
  AND p."restaurant_id" IS NULL;

-- ── 2.5. Pre-flight guard anti-órfão (P0-01 MINOR #3) ─────────
-- Garante que 100% dos produtos foram backfilled antes do SET NOT NULL.
-- Se houver produtos órfãos (categoria inexistente — INNER JOIN excluiu),
-- falha ALTO com mensagem acionável. Sem este guard, o SET NOT NULL
-- falharia com constraint violation genérica, sem indicar a causa raiz.

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM products p
  WHERE p.restaurant_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'P0-01 pre-flight falhou: % produto(s) com restaurant_id NULL após backfill. Resolver antes de prosseguir (ex.: produtos órfãos sem categoria, ou FK category_id apontando para categoria inexistente).', orphan_count;
  END IF;
END $$;

-- ── 3. Tornar NOT NULL após backfill ─────────────────────────
-- Em produção real, este ALTER só aplica se a coluna estiver NULL-able;
-- como o passo 2 preencheu tudo, agora pode virar NOT NULL. Se algum
-- Product órfão (categoria inexistente) existir, esta linha falhará
-- com constraint violation — explícito para evitar Produtos
-- cross-tenant silenciosos.

ALTER TABLE "products"
  ALTER COLUMN "restaurant_id" SET NOT NULL;

-- ── 4. Índice para queries escopadas por tenant ─────────────

CREATE INDEX IF NOT EXISTS "products_restaurant_id_idx"
  ON "products"("restaurant_id");

-- ── 5. FK para Restaurant (idempotente via pg_constraint) ────
-- onDelete: Restrict — mesmo padrão de Category/Table. Impede deletar
-- um Restaurant enquanto houver Products — preserva histórico de
-- pedidos, evita dangling products.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_restaurant_id_fkey'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_restaurant_id_fkey"
      FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT;
  END IF;
END $$;

-- ── Comentários ─────────────────────────────────────────────

COMMENT ON COLUMN "products"."restaurant_id" IS
  'Tenant autoritativo do produto. Derivado de Category.restaurantId no backfill (P0-01, 2026-07-29). Toda query Prisma deve escopar por esta coluna para prevenir BOLA.';