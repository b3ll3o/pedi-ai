# ============================================================
# NestJS API Dockerfile
# Multi-stage: builder + runner
# Build context: repo root (.)
# ============================================================

# Pinned para reprodutibilidade (Auditoria B-04): trocar a tag exige PR
# deliberado, evitando drift silencioso quando uma imagem base recebe
# patch de segurança ou breaking change.
FROM node:20.18.0-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@9.12.3

# ============================================================
# Build stage
# ============================================================
FROM base AS builder

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies using the lockfile to guarantee reproducibility.
# `--frozen-lockfile` falhará o build se `pnpm-lock.yaml` precisar de
# atualizações — isso força regenerar o lock localmente (commit) em vez de
# resolver versões divergentes em runtime.
RUN pnpm install --frozen-lockfile

# Generate Prisma client. Usando `pnpm exec` em vez de `pnpm dlx` para que a
# versão venha do node_modules local (travada pelo lockfile) — `pnpm dlx`
# baixaria a latest 5.22.x do registry a cada build.
RUN cd /app/apps/api && pnpm exec prisma generate

# Build
RUN cd /app/apps/api && pnpm build

# ============================================================
# Production stage
# Pinned para reprodutibilidade (Auditoria B-04). `wget` (já presente no
# Alpine) é usado no HEALTHCHECK — evita instalar curl via apt.
# ============================================================
FROM node:20.18.0-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for running the app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    mkdir -p /home/nestjs && chown -R nestjs:nodejs /home/nestjs

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma

# Copy pnpm-lock + workspace files needed by `pnpm install --frozen-lockfile`
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Install pnpm globally for production install (versão pinada).
RUN npm install -g pnpm@9.12.3

# Do NOT copy node_modules from builder - it contains wrong-platform binaries
# Fresh install in production using pnpm (--production skips devDependencies)
# `--frozen-lockfile` impede drift de versões.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Generate Prisma client for this platform (usa versão do lockfile).
RUN pnpm exec prisma generate --schema=./prisma/schema.prisma

# Fix ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

# HEALTHCHECK (Auditoria B-04): `wget` está disponível em Alpine sem
# instalar pacotes adicionais. Endpoint `/health` é público — não exige
# auth, ideal para probes. 30s entre checks, 5s de timeout, 3 retries
# antes de marcar como unhealthy (≈90s até ação do orquestrador).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1

# Start the server
ENTRYPOINT ["node", "dist/main.js"]
