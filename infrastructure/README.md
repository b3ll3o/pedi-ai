# ============================================================
# Pedi-AI — Infrastructure
# Configurações Docker para deploy em VPS
# ============================================================

## Estrutura

```
infrastructure/
├── nginx/
│   └── nginx.dev.conf       # Configuração Nginx (futuro)
├── scripts/
│   ├── setup-vps.sh          # Script de setup inicial
│   └── deploy.sh             # Script de deploy contínuo
```

## Quick Start (VPS)

```bash
# 1. Clone o projeto
git clone <repo-url> pedi-ai && cd pedi-ai

# 2. Copie as variáveis de ambiente
cp .env.vps.example .env.vps
# Edite .env.vps e customize as senhas!

# 3. Rode o setup
chmod +x infrastructure/scripts/setup-vps.sh
./infrastructure/scripts/setup-vps.sh

# 4. Para deploys futuros
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh
```

## URLs dos Serviços

| Serviço | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:3001 |
| Mailpit (SMTP mock) | http://localhost:8025 |
| PostgreSQL | localhost:5432 |

## Comandos Úteis

```bash
# Ver logs
docker compose -f docker-compose.dev.yml logs -f

# Restartar serviços
docker compose -f docker-compose.dev.yml restart

# Parar tudo
docker compose -f docker-compose.dev.yml down

# Rebuild sem cache
docker compose -f docker-compose.dev.yml build --no-cache

# Acessar container da API
docker exec -it pedi_ai_api sh

# Ver banco via Prisma Studio
docker exec -it pedi_ai_api npx prisma studio
```

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                        VPS                               │
│                                                         │
│  ┌─────────┐   ┌─────────┐   ┌─────────────┐           │
│  │ Postgres│   │ Mailpit │   │    API      │           │
│  │  :5432  │   │  :8025  │   │   :3001     │           │
│  └─────────┘   └─────────┘   └──────┬──────┘           │
│                                      │                   │
│                                      ▼                   │
│                               ┌─────────────┐           │
│                               │    Web      │           │
│                               │   :3000     │           │
│                               └─────────────┘           │
└─────────────────────────────────────────────────────────┘
```

## Notas

- **Hot reload**: Os containers de dev监视 arquivos fonte via volumes
- **Persistência**: Dados do PostgreSQL ficam no volume `postgres_data`
- **Rede**: Todos os serviços estão na rede `pedi_ai_network`
- Para expor para internet, configure um domínio e nginx reverso proxy