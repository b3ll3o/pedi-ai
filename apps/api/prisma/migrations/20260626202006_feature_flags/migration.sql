-- CreateEnum
CREATE TYPE "FlagScope" AS ENUM ('GLOBAL', 'RESTAURANT', 'USER');

-- CreateEnum
CREATE TYPE "FlagValueType" AS ENUM ('BOOLEAN', 'STRING', 'NUMBER', 'JSON');

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "valueType" "FlagValueType" NOT NULL DEFAULT 'BOOLEAN',
    "defaultValue" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_overrides" (
    "id" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "scope" "FlagScope" NOT NULL,
    "scopeId" TEXT,
    "rolloutPct" INTEGER,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_audit_logs" (
    "id" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flag_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flag_overrides_flagId_scope_scopeId_idx" ON "feature_flag_overrides"("flagId", "scope", "scopeId");

-- CreateIndex
CREATE INDEX "feature_flag_overrides_expiresAt_idx" ON "feature_flag_overrides"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_overrides_flagId_scope_scopeId_key" ON "feature_flag_overrides"("flagId", "scope", "scopeId");

-- CreateIndex
CREATE INDEX "feature_flag_audit_logs_flagId_createdAt_idx" ON "feature_flag_audit_logs"("flagId", "createdAt");

-- CreateIndex
CREATE INDEX "feature_flag_audit_logs_actorId_createdAt_idx" ON "feature_flag_audit_logs"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_audit_logs" ADD CONSTRAINT "feature_flag_audit_logs_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;