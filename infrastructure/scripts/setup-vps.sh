#!/bin/bash
# ============================================================
# Pedi-AI — Setup Script para VPS Development
# Uso: ./infrastructure/scripts/setup-vps.sh
# ============================================================

set -e

echo "=========================================="
echo "  Pedi-AI — Setup para VPS Development"
echo "=========================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verifica se está rodando dentro do container ou host
if [ -f /.dockerenv ]; then
    IS_DOCKER=true
else
    IS_DOCKER=false
fi

echo -e "${GREEN}[1/5]${NC} Verificando Docker e Docker Compose..."
if ! command -v docker &> /dev/null; then
    echo "Docker não encontrado. Instale primeiro."
    exit 1
fi
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose não encontrado."
    exit 1
fi

echo -e "${GREEN}[2/5]${NC} Criando arquivo de variáveis de ambiente..."
if [ ! -f .env.vps ]; then
    cat > .env.vps << 'EOF'
# PostgreSQL
POSTGRES_PASSWORD=postgres123

# JWT (MUDE em produção!)
JWT_SECRET=dev-secret-change-this-in-production
JWT_REFRESH_SECRET=dev-refresh-change-this-in-production

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://0.0.0.0:3000

# URLs públicas (atualize com seu IP ou domínio)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
    echo "   Arquivo .env.vps criado!"
else
    echo "   .env.vps já existe, pulando..."
fi

echo -e "${GREEN}[3/5]${NC} Buildando e subindo containers..."
docker compose -f docker-compose.dev.yml --env-file .env.vps up -d --build

echo -e "${GREEN}[4/5]${NC} Aguardando serviços ficarem saudáveis..."
echo "   - Postgres: "
for i in {1..30}; do
    if docker exec pedi_ai_postgres pg_isready -U postgres &> /dev/null; then
        echo "   OK"
        break
    fi
    sleep 1
    echo -n "."
done

echo "   - API: "
for i in {1..30}; do
    if curl -sf http://localhost:3001/ &> /dev/null; then
        echo "   OK"
        break
    fi
    sleep 1
    echo -n "."
done

echo "   - Web: "
for i in {1..30}; do
    if curl -sf http://localhost:3000/ &> /dev/null; then
        echo "   OK"
        break
    fi
    sleep 1
    echo -n "."
done

echo ""
echo -e "${GREEN}[5/5]${NC} Verificando logs dos serviços..."
echo ""
echo "=== POSTGRES ==="
docker compose -f docker-compose.dev.yml logs postgres --tail=5
echo ""
echo "=== API ==="
docker compose -f docker-compose.dev.yml logs api --tail=10
echo ""
echo "=== WEB ==="
docker compose -f docker-compose.dev.yml logs web --tail=10

echo ""
echo "=========================================="
echo -e "${GREEN}  Setup completo!${NC}"
echo "=========================================="
echo ""
echo "  Serviços disponíveis:"
echo "  - Web App:   http://localhost:3000"
echo "  - API:       http://localhost:3001"
echo "  - Mailpit:   http://localhost:8025"
echo "  - Postgres:  localhost:5432"
echo ""
echo "  Comandos úteis:"
echo "  - docker compose -f docker-compose.dev.yml logs -f"
echo "  - docker compose -f docker-compose.dev.yml restart"
echo "  - docker compose -f docker-compose.dev.yml down"
echo ""
echo "  Para fazer seed do banco de dados:"
echo "  - docker compose -f docker-compose.dev.yml exec api npx prisma db seed"
echo ""