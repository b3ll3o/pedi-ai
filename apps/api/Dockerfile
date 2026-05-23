# ============================================================
# NestJS API Dockerfile
# ============================================================

FROM node:20 AS base

# Install pnpm globally
RUN npm install -g pnpm@9

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

# Generate Prisma client with specific version
RUN cd /app/apps/api && pnpm dlx prisma@5.22.0 generate

# Build
RUN pnpm --filter @pedi-ai/api build

# ============================================================
# Production stage
# ============================================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for running the app
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nestjs && \
    mkdir -p /home/nestjs && chown -R nestjs:nodejs /home/nestjs

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma

# Copy package.json and lockfile for clean install in production
COPY --from=builder /app/pnpm-lock.yaml ./

# Do NOT copy node_modules from builder - it contains wrong-platform binaries
# Instead, do a fresh install in production (npm will download correct linux-x64 binaries)
RUN npm install --omit=dev --ignore-scripts

# Generate Prisma client for this platform (Debian-based node:20 uses glibc)
RUN cd /app && HOME=/tmp npx prisma@5.22.0 generate --schema=./prisma/schema.prisma

# Fix ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

# Start the server
ENTRYPOINT ["node", "dist/main.js"]