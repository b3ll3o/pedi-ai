#!/bin/bash
# ============================================================
# Script de setup para desenvolvimento local
# ============================================================

set -e

echo "🚀 Setup do ambiente de desenvolvimento Pedi-AI"

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale o Docker primeiro."
    exit 1
fi

# 2. Subir containers
echo "📦 Subindo containers Docker..."
docker-compose up -d postgres mailpit

# 3. Aguardar PostgreSQL
echo "⏳ Aguardando PostgreSQL..."
sleep 5

# 4. Instalar dependências
echo "📦 Instalando dependências..."
pnpm install

# 5. Gerar migrations
echo "🔄 Gerando migrations..."
cd apps/api && pnpm db:generate && cd ../..

# 6. Rodar migrations
echo "🔄 Aplicando migrations..."
cd apps/api && pnpm db:push && cd ../..

echo "✅ Setup completo!"
echo ""
echo "Para iniciar o ambiente:"
echo "  docker-compose up -d"
echo "  pnpm --filter @pedi-ai/api dev"
echo "  pnpm dev (em outro terminal)"
echo ""
echo "Urls:"
echo "  API:    http://localhost:3001"
echo "  Web:    http://localhost:3000"
echo "  Mailpit: http://localhost:8025"
