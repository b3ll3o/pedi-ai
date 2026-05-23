# ============================================================
# NestJS API Dockerfile
# Multi-stage: builder + runner
# Build context: repo root (.)
# ============================================================

FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@9

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

# Install dependencies (using --no-frozen-lockfile for compatibility)
RUN pnpm install --no-frozen-lockfile

# Generate Prisma client with specific version
RUN cd /app/apps/api && pnpm dlx prisma@5.22.0 generate

# Build
RUN pnpm --filter @pedi-ai/api build

# ============================================================
# Production stage
# ============================================================
FROM node:20-bullseye AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl and OpenSSL 1.1 (Prisma requires it)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for running the app
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nestjs && \
    mkdir -p /home/nestjs && chown -R nestjs:nodejs /home/nestjs

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma

# Copy pnpm-lock for clean install in production
COPY --from=builder /app/pnpm-lock.yaml ./

# Do NOT copy node_modules from builder - it contains wrong-platform binaries
# Fresh install in production
RUN npm install --omit=dev --ignore-scripts

# Generate Prisma client for this platform
RUN cd /app && npm install prisma@5.22.0 && npx prisma generate --schema=./prisma/schema.prisma

# Fix ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

# Start the server
ENTRYPOINT ["node", "dist/main.js"]