-- Migration: add_referral_system
-- Data: 2026-07-06
-- Descrição: Adiciona tabelas Referral e ReferralConversion para o programa de indicação
-- Documentação: /root/pedi-ai-upgrade/referral/REFERRAL.md

-- ── Enums ────────────────────────────────────────────────────────

CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'cancelled', 'expired');

CREATE TYPE "ReferralConversionStatus" AS ENUM ('pending', 'rewarded', 'cancelled');

-- ── Tabela: referrals ────────────────────────────────────────────

CREATE TABLE "referrals" (
    "id"                          UUID NOT NULL DEFAULT gen_random_uuid(),
    "referrerRestaurantId"        UUID NOT NULL,
    "code"                        TEXT NOT NULL,
    "totalSignups"                INTEGER NOT NULL DEFAULT 0,
    "totalConversions"            INTEGER NOT NULL DEFAULT 0,
    "rewardCreditMonths"          INTEGER NOT NULL DEFAULT 0,
    "rewardCreditAppliedMonths"   INTEGER NOT NULL DEFAULT 0,
    "status"                      "ReferralStatus" NOT NULL DEFAULT 'pending',
    "createdAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                   TIMESTAMP(3) NOT NULL,
    "version"                     INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "referrals_referrerRestaurantId_key" ON "referrals"("referrerRestaurantId");
CREATE UNIQUE INDEX "referrals_code_key" ON "referrals"("code");

-- Performance indexes
CREATE INDEX "referrals_code_idx" ON "referrals"("code");
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- ── Tabela: referral_conversions ─────────────────────────────────

CREATE TABLE "referral_conversions" (
    "id"                      UUID NOT NULL DEFAULT gen_random_uuid(),
    "referralId"              UUID NOT NULL,
    "referredRestaurantId"    UUID NOT NULL,
    "status"                  "ReferralConversionStatus" NOT NULL DEFAULT 'pending',
    "convertedAt"             TIMESTAMP(3),
    "rewardedAt"              TIMESTAMP(3),
    "rewardMonths"            INTEGER NOT NULL DEFAULT 1,
    "triggeringSubscriptionId" TEXT,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_conversions_pkey" PRIMARY KEY ("id")
);

-- Unique constraint (1:1 com Restaurant)
CREATE UNIQUE INDEX "referral_conversions_referredRestaurantId_key" ON "referral_conversions"("referredRestaurantId");

-- Performance indexes
CREATE INDEX "referral_conversions_referralId_idx" ON "referral_conversions"("referralId");
CREATE INDEX "referral_conversions_status_idx" ON "referral_conversions"("status");

-- ── Foreign Keys ────────────────────────────────────────────────

-- Referral → Restaurant (referrer)
ALTER TABLE "referrals"
    ADD CONSTRAINT "referrals_referrerRestaurantId_fkey"
    FOREIGN KEY ("referrerRestaurantId")
    REFERENCES "restaurants"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ReferralConversion → Referral
ALTER TABLE "referral_conversions"
    ADD CONSTRAINT "referral_conversions_referralId_fkey"
    FOREIGN KEY ("referralId")
    REFERENCES "referrals"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ReferralConversion → Restaurant (referred)
ALTER TABLE "referral_conversions"
    ADD CONSTRAINT "referral_conversions_referredRestaurantId_fkey"
    FOREIGN KEY ("referredRestaurantId")
    REFERENCES "restaurants"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ── Validações de integridade ────────────────────────────────────

-- Garante rewardCreditMonths >= rewardCreditAppliedMonths
ALTER TABLE "referrals"
    ADD CONSTRAINT "referrals_credit_check"
    CHECK ("rewardCreditMonths" >= "rewardCreditAppliedMonths" AND "rewardCreditAppliedMonths" >= 0);

-- Garante que totalConversions <= 100 (anti-abuse)
ALTER TABLE "referrals"
    ADD CONSTRAINT "referrals_conversions_limit_check"
    CHECK ("totalConversions" <= 100 AND "totalConversions" >= 0);

-- Garante que rewardCreditMonths <= 12 (3 meses * 4 tiers é o máximo absoluto)
ALTER TABLE "referrals"
    ADD CONSTRAINT "referrals_credit_limit_check"
    CHECK ("rewardCreditMonths" <= 100);

-- ── Índices adicionais para queries comuns ─────────────────────

-- Query: "top referrers por número de conversões"
CREATE INDEX "referrals_totalConversions_idx" ON "referrals"("totalConversions" DESC);

-- Query: "conversões pendentes de reward"
CREATE INDEX "referral_conversions_pending_idx"
    ON "referral_conversions"("status", "convertedAt")
    WHERE "status" = 'pending';

-- ── Comentários ────────────────────────────────────────────────

COMMENT ON TABLE "referrals" IS 'Programa de referral — 1:1 com Restaurant';
COMMENT ON COLUMN "referrals"."code" IS 'Código único de 8 chars (sem I, O, 0, 1)';
COMMENT ON COLUMN "referrals"."rewardCreditMonths" IS 'Tier: 0 (0-2 conv) | 1 (3-5) | 2 (6-10) | 3 (11+)';

COMMENT ON TABLE "referral_conversions" IS 'Registro de cada referred que se cadastrou';
COMMENT ON COLUMN "referral_conversions"."status" IS 'pending → rewarded quando 1ª assinatura confirmada';