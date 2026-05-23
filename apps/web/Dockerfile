# ============================================================
# Next.js Web Dockerfile
# Multi-stage: builder + runner
# Build context: repo root (.)
# ============================================================

FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@9 --activate

# Native build tools for modules like sharp
RUN apk add --no-cache python3 make g++ curl

# ============================================================
# Build stage
# ============================================================
FROM base AS builder

WORKDIR /app

# Copy monorepo workspace config (allows packages/* resolution)
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./

# Copy all packages (monorepo deps resolution for packages/shared)
COPY packages ./packages

# Copy Next.js app source
COPY apps/web/src ./src
COPY apps/web/public ./public
COPY apps/web/next.config.ts ./
COPY apps/web/tsconfig.json ./
COPY apps/web/package.json ./

# Install dependencies (using --no-frozen-lockfile for compatibility)
# NOTE: For strict reproducibility, ensure pnpm-lock.yaml matches package.json before build
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Build Next.js app
RUN pnpm build

# ============================================================
# Production stage
# ============================================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application (files are at /app/* not /app/apps/web/*)
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy packages for runtime resolution
COPY --from=builder /app/packages ./packages

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --production --ignore-scripts

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start", "--port", "3000"]