#!/usr/bin/env bash
# ============================================================
# build-prod.sh — Build do monorepo para produção (VPS standalone)
#
# IMPORTANTE: TypeScript 6.0.3 + `incremental: true` (configurado no
# `apps/api/tsconfig.json`) tem um bug que faz o `nest build` emitir
# ZERO arquivos. Solução: usar `tsc --incremental false` direto.
#
# Referência: PR `fix/web-build-referral-getApiClient` documentou isso.
#
# Uso: bash infrastructure/scripts/build-prod.sh
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/../.."  # raiz do monorepo

echo "==> Limpando builds anteriores..."
rm -rf apps/api/dist
rm -rf packages/shared/dist apps/web/.next

echo "==> Instalando deps (frozen lockfile)..."
pnpm install --frozen-lockfile

echo "==> Build @pedi-ai/shared (workspace)..."
pnpm --filter @pedi-ai/shared exec tsc

echo "==> Build @pedi-ai/api (NestJS + Fastify)..."
# Workaround TS 6 + incremental: tsc direto sem incremental.
cd apps/api
rm -f tsconfig.tsbuildinfo
npx tsc --incremental false
cd ../..

echo "==> Build @pedi-ai/web (Next.js 16)..."
pnpm --filter @pedi-ai/web build

echo ""
echo "==> Verificando artefatos..."
test -f apps/api/dist/main.js   && echo "  ✓ apps/api/dist/main.js"
test -d packages/shared/dist    && echo "  ✓ packages/shared/dist/"
test -d apps/web/.next          && echo "  ✓ apps/web/.next/"

echo ""
echo "✅ Build OK. Próximo passo: bash infrastructure/scripts/deploy.sh"