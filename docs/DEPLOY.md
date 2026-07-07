# 🚀 Guia de Deploy — PediAI

**Última atualização:** 06 de julho de 2026

Este guia descreve como fazer deploy de produção do monorepo PediAI em **Vercel** (frontend Next.js) + **Fly.io** (backend NestJS + Postgres).

---

## 📋 Pré-requisitos

- [ ] Conta Vercel (grátis): https://vercel.com
- [ ] Conta Fly.io (grátis para começar): https://fly.io
- [ ] Domínio próprio (recomendado): `.com.br` (R$ 40/ano) ou `.com` (R$ 60/ano)
- [ ] Chaves de API externas:
  - [ ] **Sentry DSN**: https://sentry.io (free tier: 5k eventos/mês)
  - [ ] **Resend API key**: https://resend.com (free tier: 100 emails/dia)
  - [ ] **Mercado Pago Access Token**: https://mercadopago.com.br/developers
  - [ ] **Asaas API Key**: https://www.asaas.com (cobrança recorrente)
  - [ ] **Plausible domínio**: https://plausible.io (free tier: 10k eventos/mês)

---

## 1️⃣ Deploy do Backend (Fly.io)

### 1.1. Instalar Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth signup  # ou `fly auth login` se já tem conta
```

### 1.2. Provisionar Postgres

```bash
# Cria app no Fly
fly apps create pedi-ai-api

# Provisiona Postgres gerenciado (1GB grátis no starter)
fly postgres create --name pedi-ai-db --region gru

# Anexa ao app (cria DATABASE_URL automaticamente)
fly postgres attach pedi-ai-db --app pedi-ai-api
```

### 1.3. Configurar Secrets

```bash
# JWT
fly secrets set JWT_SECRET="$(openssl rand -hex 32)" --app pedi-ai-api
fly secrets set JWT_REFRESH_SECRET="$(openssl rand -hex 32)" --app pedi-ai-api

# Mercado Pago
fly secrets set MP_ACCESS_TOKEN="APP_USR-..." --app pedi-ai-api
fly secrets set MP_WEBHOOK_SECRET="..." --app pedi-ai-api

# Asaas
fly secrets set ASAAS_API_KEY="..." --app pedi-ai-api
fly secrets set ASAAS_ENVIRONMENT="production" --app pedi-ai-api

# Sentry
fly secrets set SENTRY_DSN="https://...@sentry.io/..." --app pedi-ai-api

# CORS (substituir pelo domínio real)
fly secrets set ALLOWED_ORIGINS="https://pedi.ai,https://www.pedi.ai" --app pedi-ai-api

# Postgres URL (já foi anexado automaticamente)
fly secrets list --app pedi-ai-api
```

### 1.4. Deploy

```bash
# Na raiz do monorepo
fly deploy --config fly.api.toml --dockerfile apps/api/Dockerfile
```

> **NOTA:** Crie `fly.api.toml` na raiz (template abaixo). Se ainda não existir, peça ao Claude Code para criar baseado no `apps/api/Dockerfile`.

### 1.5. Rodar Migrations

```bash
fly ssh console --app pedi-ai-api -C "npx prisma migrate deploy"
```

### 1.6. Validar

```bash
# Health check
curl https://pedi-ai-api.fly.dev/health

# Deve retornar: {"status":"ok"}
```

---

## 2️⃣ Deploy do Frontend (Vercel)

### 2.1. Conectar repositório

1. Vá em https://vercel.com/new
2. Importe o repo `b3ll3o/pedi-ai`
3. **Root Directory:** `apps/web`
4. **Build Command:** `pnpm build`
5. **Install Command:** `pnpm install`
6. **Output Directory:** `.next` (padrão)

### 2.2. Configurar Environment Variables

Na Vercel dashboard, em **Settings → Environment Variables**, adicione:

```bash
# API
NEXT_PUBLIC_API_URL=https://pedi-ai-api.fly.dev
NEXT_PUBLIC_APP_URL=https://pedi.ai

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_RELEASE=$VERCEL_GIT_COMMIT_SHA

# Plausible
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=pedi.ai

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@pedi.ai
RESEND_FROM_NAME=PediAI

# Feature flags (ligar só as necessárias)
NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED=true
NEXT_PUBLIC_FEATURE_PIX_ENABLED=true
NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED=true
NEXT_PUBLIC_FEATURE_COMBOS_ENABLED=true
NEXT_PUBLIC_FEATURE_WAITER_MODE=false
NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED=true
NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED=false
NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT=false
```

### 2.3. Configurar Domínio Custom

1. Em **Settings → Domains**, adicione `pedi.ai` e `www.pedi.ai`
2. Configure DNS no seu provedor:

```
A    @        76.76.21.21
CNAME www      cname.vercel-dns.com
```

### 2.4. Deploy

```bash
# Push para master dispara deploy automático na Vercel
git push origin master

# OU usar Vercel CLI
cd apps/web
vercel --prod
```

---

## 3️⃣ Configurar Webhooks Externos

### 3.1. Mercado Pago

1. Painel MP → **Suas integrações → Webhooks**
2. Adicionar URL: `https://pedi-ai-api.fly.dev/payments/webhooks/pix`
3. Evento: `payment` (created, updated)

### 3.2. Asaas

1. Painel Asaas → **Configurações → Webhooks**
2. Adicionar URL: `https://pedi-ai-api.fly.dev/webhooks/asaas`
3. Eventos: `PAYMENT_CREATED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`

### 3.3. Sentry

1. Já é automático (DSN no env var).

### 3.4. Plausible

1. Adicionar domínio `pedi.ai` em https://plausible.io/sites
2. Snippet é injetado automaticamente via componente.

---

## 4️⃣ Pós-Deploy

### 4.1. Smoke Tests

```bash
# Frontend
curl -I https://pedi.ai

# Backend
curl https://pedi-ai-api.fly.dev/health

# Frontend → Backend (CORS)
curl -H "Origin: https://pedi.ai" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://pedi-ai-api.fly.dev/auth/login
```

### 4.2. Configurar Backups Automáticos

```bash
# Backups diários do Postgres no Fly (configurar no fly.toml)
[deploy]
  release_command = "npx prisma migrate deploy && node scripts/backup.js"
```

### 4.3. Monitoramento

- [ ] **Sentry**: erros e performance → https://sentry.io
- [ ] **Plausible**: analytics web → https://plausible.io/pedi.ai
- [ ] **Fly.io logs**: `fly logs --app pedi-ai-api`
- [ ] **Vercel logs**: https://vercel.com/dashboard

### 4.4. Status Page

Recomendado criar em https://instatus.com (free) e configurar:
- Frontend (Vercel) status
- API (Fly.io) status
- Webhooks (MP, Asaas) status

---

## 5️⃣ Rollback

Se algo der errado:

```bash
# Backend
fly releases --app pedi-ai-api
fly releases rollback --app pedi-ai-api

# Frontend
vercel rollback  # na Vercel dashboard ou CLI
```

---

## 6️⃣ Custos Estimados

| Serviço | Plano Free | Custo Mensal Estimado (10-100 clientes) |
|---|---|---|
| **Vercel** | Hobby (grátis) | R$ 0 (até 100GB bandwidth) |
| **Fly.io** | Free tier (3 shared VMs) | R$ 50-200 (1 VM always-on + Postgres) |
| **Postgres (Fly)** | 1GB grátis | R$ 0-50 (até 10GB) |
| **Sentry** | 5k eventos/mês | R$ 0 |
| **Plausible** | 10k pageviews/mês | R$ 0 |
| **Resend** | 100 emails/dia | R$ 0 |
| **Mercado Pago** | Sem mensalidade | R$ 0 + taxa por transação |
| **Asaas** | Sem mensalidade | R$ 0 + taxa por transação |
| **Domínio .com.br** | — | R$ 40/ano |
| **TOTAL** | | **R$ 50-250/mês** |

**Break-even:** com **2-3 clientes pagantes** (R$ 99-199/mês cada), você cobre os custos de infra.

---

## 7️⃣ Próximos Passos Pós-Lançamento

1. **Beta fechado:** 5-10 conhecidos donos de restaurante
2. **Coletar feedback** diário (WhatsApp + Sentry)
3. **Iterar bugs** em tempo real
4. **Conteúdo de marketing** (Instagram/TikTok)
5. **SEO local** ("cardápio digital [cidade]")
6. **Parcerias** (Abrasel, SindRest, etc)
7. **Programa de indicação** (1 mês grátis por amigo)
8. **Lançamento público** após 30 dias de beta

---

## 🆘 Troubleshooting

### Frontend: "Failed to fetch" em chamadas à API

- Verificar `NEXT_PUBLIC_API_URL` está com `https://` (não `http://`)
- Verificar CORS no backend (`ALLOWED_ORIGINS` deve incluir domínio do frontend)
- Checar se a API está respondendo: `curl https://pedi-ai-api.fly.dev/health`

### Backend: Webhooks não chegando

- Mercado Pago: validar URL + token
- Asaas: validar URL + token
- Verificar logs do Fly: `fly logs --app pedi-ai-api | grep webhook`

### Postgres: "Too many connections"

```bash
# Aumentar pool no Prisma
DATABASE_URL="postgresql://...?connection_limit=10"
```

---

**Deploy feito! Agora é validar com clientes reais. 🚀**