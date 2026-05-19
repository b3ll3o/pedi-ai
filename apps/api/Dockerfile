# ============================================================
# NestJS API Dockerfile
# ============================================================

FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@8

# ============================================================
# Build stage
# ============================================================
FROM base AS builder

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd /app/apps/api && npx prisma generate

# Build
RUN pnpm --filter @pedi-ai/api build

# ============================================================
# Production stage
# ============================================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy Prisma schema (needed for migrate deploy at startup)
COPY --from=builder /app/apps/api/prisma ./prisma

# Copy startup script
COPY --from=builder /app/apps/api/scripts/start.sh ./start.sh

# Install production dependencies only (dev deps excluded, lockfile respected)
RUN pnpm install --prod --ignore-scripts && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

ENTRYPOINT ["sh", "./start.sh"]
