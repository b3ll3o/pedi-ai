#!/usr/bin/env bash
# ============================================================
# verify-prod.sh — Health checks pós-deploy
#
# Uso: bash infrastructure/scripts/verify-prod.sh [host]
#   host default = 127.0.0.1
# ============================================================
set -uo pipefail

HOST="${1:-127.0.0.1}"
PASS=0
FAIL=0
TIMEOUT=5

check() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"
  local actual
  actual=$(curl -sk -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  if [[ "$actual" == "$expected" ]]; then
    echo "  ✓ $name → HTTP $actual"
    ((PASS++)) || true
  else
    echo "  ✗ $name → HTTP $actual (esperado $expected)"
    ((FAIL++)) || true
  fi
}

echo "==> Verificando deploy em $HOST"
echo ""

echo "Web (Next.js na 3000):"
check "GET /"                   "http://$HOST:3000/"
check "GET /login"              "http://$HOST:3000/login"
check "GET /termos"             "http://$HOST:3000/termos"
check "GET /privacidade"        "http://$HOST:3000/privacidade"

echo ""
echo "API (NestJS na 3001):"
check "GET /health/db"          "http://$HOST:3001/health/db"
check "GET /health/redis"       "http://$HOST:3001/health/redis"
# /health/full pode ser 503 se Redis/Postgres ausentes — avisamos mas não falhamos.

echo ""
echo "Via nginx (HTTPS → proxy):"
check "GET https://$HOST/"      "https://$HOST/"
check "GET https://$HOST/api/health/db" "https://$HOST/api/health/db"

echo ""
echo "==> Resumo: $PASS OK, $FAIL falhou"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1