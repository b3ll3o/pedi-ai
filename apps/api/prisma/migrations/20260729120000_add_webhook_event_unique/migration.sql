-- Migration: add_webhook_event_unique (P0-04)
-- Data: 2026-07-29
-- Descrição: Adiciona `provider`, `externalId`, `payload`, `receivedAt`
-- em WebhookEvent + unique constraint GLOBAL em `externalId`.
--
-- Idempotente — pode ser aplicada múltiplas vezes sem erro
-- (uso de `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
--
-- Backfill seguro:
--   - provider/externalId/payload adicionados como nullable para não
--     quebrar linhas pré-existentes
--   - linhas pré-existentes ficam NULL nesses campos após o deploy
--   - No PostgreSQL, NULL != NULL em unique index — múltiplas linhas
--     com externalId NULL são permitidas (não bloqueia)
--   - Novos INSERTs do código passam a popular provider/externalId
--     explicitamente, tornando a constraint efetiva em produção
--
-- Compatibilidade:
--   - `processedAt` ganha `DEFAULT now()` para alinhar com schema Prisma
--   - `receivedAt` adicionado com `DEFAULT now()`

-- ── Adicionar colunas novas (nullable para não quebrar dados existentes) ─

ALTER TABLE "WebhookEvent"
  ADD COLUMN IF NOT EXISTS "provider"   TEXT;

ALTER TABLE "WebhookEvent"
  ADD COLUMN IF NOT EXISTS "externalId" TEXT;

ALTER TABLE "WebhookEvent"
  ADD COLUMN IF NOT EXISTS "payload"    JSONB;

ALTER TABLE "WebhookEvent"
  ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);

-- ── Backfill receivedAt para linhas existentes (não pode ficar NULL) ─

UPDATE "WebhookEvent"
  SET "receivedAt" = COALESCE("receivedAt", "processedAt", CURRENT_TIMESTAMP)
  WHERE "receivedAt" IS NULL;

-- ── Garantir DEFAULT now() em receivedAt para novos INSERTs ──

ALTER TABLE "WebhookEvent"
  ALTER COLUMN "receivedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- ── Garantir DEFAULT now() em processedAt (consistência com schema) ──

ALTER TABLE "WebhookEvent"
  ALTER COLUMN "processedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- ── Índices ──────────────────────────────────────────────────────────

-- Unique constraint em externalId (GLOBAL) — impede colisão cross-provider.
--
-- Por que GLOBAL e não composta (provider, externalId)?
--   A composta permitiria o cenário bug do P0-04: tuples
--   (mercadopago, X) e (asaas, X) são distintas e passariam a unique.
--   O débito PIX duplicado cross-provider exige isolamento GLOBAL do
--   externalId — qualquer INSERT com externalId já presente (independente
--   de provider) deve falhar com P2002.
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_externalId_key"
  ON "WebhookEvent"("externalId");

-- Índice composto para queries de listagem por provider + janela temporal
-- (ex: cleanup queue varre `provider, receivedAt` para eventos antigos).
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_receivedAt_idx"
  ON "WebhookEvent"("provider", "receivedAt");

-- ── Comentários ──────────────────────────────────────────────────────

COMMENT ON COLUMN "WebhookEvent"."provider"   IS 'Origem do webhook (mercadopago, asaas, ...) — chave de isolamento cross-provider';
COMMENT ON COLUMN "WebhookEvent"."externalId" IS 'ID do evento no provider (escopado por provider)';
COMMENT ON COLUMN "WebhookEvent"."payload"    IS 'Payload bruto do webhook — preservado para auditoria/replay';
COMMENT ON COLUMN "WebhookEvent"."receivedAt" IS 'Quando o webhook chegou na API (≠ processedAt, que é quando terminou de processar)';