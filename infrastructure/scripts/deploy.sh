#!/usr/bin/env bash
# ============================================================
# deploy.sh — Deploy do monorepo na VPS via systemd
#
# Pré-requisitos:
#   - Build OK (`bash infrastructure/scripts/build-prod.sh`)
#   - `.env` existe em /root/pedi-ai/.env com TODAS as vars REQUIRED-PROD
#   - systemd units em /etc/systemd/system/pedi-ai-{api,web}.service
#   - nginx config em /etc/nginx/sites-enabled/andreazzi.tech
#
# Uso: sudo bash infrastructure/scripts/deploy.sh
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/../.."

# --- pré-checks ---
if [[ ! -f .env ]]; then
  echo "❌ .env não encontrado em $(pwd)/.env"
  echo "   Copie .env.example e preencha TODAS as vars [REQUIRED-PROD]"
  exit 1
fi

# Valida que cada var [REQUIRED-PROD] está preenchida.
required_vars=(
  JWT_SECRET JWT_REFRESH_SECRET JWT_ISSUER JWT_AUDIENCE
  PII_ENCRYPTION_KEY
  QR_SECRET_KEY SESSION_SECRET COOKIE_SECRET CSRF_SECRET
  MP_WEBHOOK_SECRET
)
missing=()
for v in "${required_vars[@]}"; do
  if ! grep -qE "^${v}=.+" .env; then
    missing+=("$v")
  fi
done
if (( ${#missing[@]} > 0 )); then
  echo "❌ Vars [REQUIRED-PROD] faltando ou vazias em .env:"
  printf '   - %s\n' "${missing[@]}"
  echo "   Preencha antes de subir. Em prod sem elas a API recusa iniciar."
  exit 2
fi

echo "==> Reinstalando systemd units (se mudaram)..."
if [[ -f infrastructure/systemd/pedi-ai-api.service ]]; then
  cp infrastructure/systemd/pedi-ai-api.service /etc/systemd/system/
fi
if [[ -f infrastructure/systemd/pedi-ai-web.service ]]; then
  cp infrastructure/systemd/pedi-ai-web.service /etc/systemd/system/
fi
systemctl daemon-reload
systemctl enable pedi-ai-api.service pedi-ai-web.service

echo "==> Recarregando nginx (se config mudou)..."
if [[ -f infrastructure/nginx/andreazzi.tech.conf ]]; then
  # Confirmação manual: rodar `nginx -t` antes de aplicar.
  echo "   (opcional) copie o nginx config e rode: nginx -t && systemctl reload nginx"
fi

echo "==> Restart serviços (graceful)..."
systemctl restart pedi-ai-api.service
sleep 3
systemctl restart pedi-ai-web.service
sleep 3

echo "==> Verificando..."
bash infrastructure/scripts/verify-prod.sh