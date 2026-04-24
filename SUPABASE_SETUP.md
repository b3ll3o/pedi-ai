# Supabase Setup Guide

This guide explains how to set up Supabase for the pedi-ai project.

## Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase CLI installed (`npm install -g supabase`)

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Enter a project name (e.g., `pedi-ai-dev`)
4. Choose a region closest to your users
5. Set a strong database password (save this!)
6. Select the **Free tier** for development
7. Click **Create new project** and wait for provisioning (~2 minutes)

---

## 2. Get Your Environment Variables

After project creation, go to **Project Settings > API**:

### Required Variables

| Variable | Location |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings > API > `anon` key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings > API > `service_role` key (PRIVATE!) |
| `NEXT_PUBLIC_SUPABASE_SITE_URL` | Project Settings > General > Site URL |

### Steps:

1. Copy `.env.local.example` to `.env.local`
2. Fill in each variable from your Supabase dashboard
3. **Never commit `.env.local` to version control**

---

## 3. Configurar Supabase Cloud (E2E)

Para testes E2E, o projeto usa **Supabase Cloud** em vez de local.

### Arquivo `.env.e2e`

```bash
cp .env.local.example .env.e2e
```

Edite `.env.e2e` com as credenciais do seu projeto Supabase Cloud:

```env
NEXT_PUBLIC_DEMO_PAYMENT_MODE=true
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### Aplicar Migrations

```bash
# Login via CLI
supabase login --token SEU_ACCESS_TOKEN

# Linkar projeto
supabase link --project-ref SEU_PROJECT_REF

# Push migrations (necessário apenas uma vez ou ao alterar schema)
supabase db push
```

### Executar Seed E2E

```bash
# Popula dados de teste no Supabase Cloud
pnpm test:e2e:seed

# Limpa dados de teste
pnpm test:e2e:cleanup
```

---

## 4. Aplicar Migrations

```bash
# Login (obtenha token em https://supabase.com/dashboard/account/tokens)
supabase login --token SEU_ACCESS_TOKEN

# Linkar ao projeto cloud
supabase link --project-ref SEU_PROJECT_REF

# Push migrations para cloud
supabase db push

# Para resetar (cuidado: apaga todos os dados)
supabase db reset
```

> **Nota**: Migrations estão em `supabase/migrations/` (16 arquivos SQL)

---

## 5. Run Edge Functions Locally

```bash
# Serve all edge functions
supabase functions serve

# Or run a specific function
supabase functions serve function-name
```

---

## 6. Project Structure

```
supabase/
├── config.toml          # Supabase CLI configuration
├── migrations/          # Database schema migrations
│   ├── 0001_create_restaurants.sql
│   ├── 0002_create_tables.sql
│   └── ...              # Additional schema migrations
└── functions/           # Edge Functions (Deno)
    └── pix-webhook/     # Exemplo de função Edge
        └── index.ts
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 54321
lsof -i :54321
# or
supabase start --override-name my-project
```

### Reset Local Database

```bash
supabase db reset
```

### Re-link Project

```bash
supabase link --project-ref your-project-id
```

---

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/guides/cli/reference)
- [@supabase/supabase-js](https://supabase.com/docs/library/client/setup)
