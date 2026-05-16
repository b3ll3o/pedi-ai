# ============================================================
# NestJS API Dockerfile
# ============================================================

FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

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

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Change ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main"]
