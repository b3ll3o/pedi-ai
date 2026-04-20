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

1. Copy `apps/web/.env.local.example` to `apps/web/.env.local`
2. Fill in each variable from your Supabase dashboard
3. **Never commit `.env.local` to version control**

---

## 3. Run Supabase Locally (Development)

### Start Local Supabase Instance

```bash
# From project root
supabase init

# Start all services (Postgres, Auth, Storage, Realtime)
supabase start

# Get local credentials
supabase status
```

### Local Default Credentials

| Service | URL |
|---------|-----|
| PostgreSQL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| API | `http://127.0.0.1:54321` |
| Studio | `http://127.0.0.1:54323` |
| Inbucket (email) | `http://127.0.0.1:54324` |

### Stop Local Supabase

```bash
supabase stop
```

---

## 4. Apply Database Migrations

```bash
# Link to local project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Or reset database
supabase db reset
```

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
│   └── 001_initial_schema.sql
└── functions/           # Edge Functions (Deno)
    └── your-function/
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
