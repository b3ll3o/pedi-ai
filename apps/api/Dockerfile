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
RUN cd /app/apps/api && pnpm build

# ============================================================
# Production stage
# ============================================================
FROM node:20-bookworm AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl for healthchecks (Debian)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for running the app
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nestjs && \
    mkdir -p /home/nestjs && chown -R nestjs:nodejs /home/nestjs

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma

# Copy pnpm-lock for production install
COPY --from=builder /app/pnpm-lock.yaml ./

# Install pnpm globally for production install
RUN npm install -g pnpm@9

# Do NOT copy node_modules from builder - it contains wrong-platform binaries
# Fresh install in production using pnpm (--production skips devDependencies)
RUN pnpm install --production --ignore-scripts

# Generate Prisma client for this platform
RUN pnpm dlx prisma@5.22.0 generate --schema=./prisma/schema.prisma

# Fix ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

# Start the server
ENTRYPOINT ["node", "dist/main.js"]
