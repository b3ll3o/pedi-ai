-- Migration: add_asaas_subscription_id
-- Data: 2026-07-06
-- Descrição: Adiciona coluna asaasSubscriptionId na tabela subscriptions
--            pra mapear webhook do Asaas → nossa subscription.
-- Auditoria: review pós-implementação Referral (14-AUDITORIA-COMPLETA.md)

-- Adiciona coluna nullable (subscriptions existentes sem Asaas ID ficam OK)
ALTER TABLE "subscriptions" ADD COLUMN "asaasSubscriptionId" TEXT;

-- Cria unique index separadamente (não inline com @unique)
-- pra permitir backfill antes de aplicar constraint em prod
CREATE UNIQUE INDEX "subscriptions_asaasSubscriptionId_key"
    ON "subscriptions"("asaasSubscriptionId")
    WHERE "asaasSubscriptionId" IS NOT NULL;