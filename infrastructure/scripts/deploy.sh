#!/bin/bash
# ============================================================
# Pedi-AI — Deploy Script (para VPS)
# Uso: ./infrastructure/scripts/deploy.sh
# ============================================================

set -e

echo "=========================================="
echo "  Pedi-AI — Deploy"
echo "=========================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Carrega variáveis de ambiente
if [ -f .env.vps ]; then
    export $(cat .env.vps | grep -v '^#' | xargs)
fi

echo -e "${GREEN}[1/3]${NC} Fazendo pull das últimas mudanças..."
git pull origin master

echo -e "${GREEN}[2/3]${NC} Reconstruindo e subindo containers..."
docker compose -f docker-compose.yml --env-file .env.vps up -d --build

echo -e "${GREEN}[3/3]${NC} Verificando saúde dos serviços..."
sleep 5

echo ""
echo "=== Logs Recentes ==="
docker compose -f docker-compose.yml logs --tail=20

echo ""
echo "=========================================="
echo -e "${GREEN}  Deploy completo!${NC}"
echo "=========================================="