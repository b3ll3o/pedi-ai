# Infrastructure — Deploy do Pedi-AI em VPS standalone

Arquivos de configuração pra subir o monorepo numa VPS sem Docker Compose
(apps rodando via `systemd`, banco/redis em containers Docker separados).

## Estrutura

```
infrastructure/
├── systemd/
│   ├── pedi-ai-api.service    # NestJS na porta 3001
│   └── pedi-ai-web.service    # Next.js na porta 3000
├── nginx/
│   └── andreazzi.tech.conf    # HTTPS reverse proxy + security headers
└── scripts/
    ├── build-prod.sh          # Build completo (workaround TS 6 incremental)
    ├── deploy.sh              # Aplica configs + restart serviços
    └── verify-prod.sh         # Health checks pós-deploy
```

## Setup inicial (one-time)

```bash
# 1. Clone do monorepo
git clone https://github.com/b3ll3o/pedi-ai.git /root/pedi-ai
cd /root/pedi-ai

# 2. Instalar deps + build
pnpm install
bash infrastructure/scripts/build-prod.sh

# 3. Configurar .env (TODAS as vars [REQUIRED-PROD])
cp .env.example .env
# Preencher todas as vars JWT_*, PII_*, *_SECRET, MP_WEBHOOK_SECRET, etc.
# Dica: openssl rand -hex 32  (32 bytes = 64 chars hex = AES-256)

# 4. Subir Postgres + Redis (containers)
docker run -d --name postgres -p 5432:5432 \
  -e POSTGRES_PASSWORD=admin -e POSTGRES_USER=admin \
  -v postgres_data:/var/lib/postgresql/data postgres:16

docker run -d --name redis -p 6379:6379 redis:7-alpine

# 5. Aplicar Prisma migrations
cd apps/api && npx prisma migrate deploy && cd ../..

# 6. Instalar systemd units
sudo cp infrastructure/systemd/pedi-ai-{api,web}.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pedi-ai-api pedi-ai-web

# 7. Instalar nginx config
sudo cp infrastructure/nginx/andreazzi.tech.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Atualizar deploy (após git pull)

```bash
cd /root/pedi-ai
git pull
bash infrastructure/scripts/build-prod.sh
bash infrastructure/scripts/deploy.sh
```

## Health check

```bash
bash infrastructure/scripts/verify-prod.sh                  # local
bash infrastructure/scripts/verify-prod.sh andreazzi.tech   # via domínio
```

## Notas técnicas

### Por que `tsc --incremental false` no `build-prod.sh`?

`apps/api/tsconfig.json` tem `incremental: true`. TypeScript 6.0.3 tem
um bug onde `nest build` (que usa `incremental: true`) emite ZERO arquivos
em dist/. Solução: rodar `tsc --incremental false` direto, que respeita o
resto do tsconfig e emite corretamente.

Referência: investigação durante deploy de 2026-07-28.

### Por que `Environment=PORT=3001` separado no .env?

O `.env` é compartilhado entre API (3001) e Web (3000). `EnvironmentFile=`
no systemd carrega o arquivo INTEIRO, sobrescrevendo `Environment=` da unit.
Solução adotada: deixar `PORT=3001` no `.env` (a API é a que precisa de
valor explícito) e usar flag `--port 3000` no `ExecStart` do web service
(Next 16 não honra `PORT` do env de qualquer jeito).

### Por que systemd e não PM2 / Docker Compose?

- Docker Compose já existe (`docker-compose.yml` no root) e funciona pra
  dev. Em produção, apps Node ficam mais leves rodando direto via systemd
  (sem overhead de container).
- BullMQ workers e Next.js SSR funcionam melhor com init do systemd.
- `Restart=always` + `RestartSec=5` dão resiliência equivalente ao
  `restart: unless-stopped` do Docker.
