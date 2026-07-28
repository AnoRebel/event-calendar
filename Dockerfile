# Multi-stage Docker build for production optimization

# Base stage with common dependencies
FROM node:20-alpine AS base
WORKDIR /app

# Install bun for better performance
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock* ./

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
# Install ALL deps (including dev) — needed for the build. --production is omitted
# so devDependencies are included (this Bun rejects --production=false).
RUN bun install --frozen-lockfile

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server

# Analytics site IDs are baked in at BUILD time (nuxt-umami). Pass them as build
# args so the deployed bundle actually tracks. Safe to omit — the build warns and
# analytics simply stays off.
ARG NUXT_UMAMI_SITE_ID=""
ARG NUXT_RYBBIT_SITE_ID=""
ARG NUXT_PUBLIC_ENABLE_ANALYTICS="true"
ENV NUXT_UMAMI_SITE_ID=$NUXT_UMAMI_SITE_ID
ENV NUXT_RYBBIT_SITE_ID=$NUXT_RYBBIT_SITE_ID
ENV NUXT_PUBLIC_ENABLE_ANALYTICS=$NUXT_PUBLIC_ENABLE_ANALYTICS

# Build the application
RUN bun run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user for security. su-exec lets the entrypoint start as root
# (to fix the mounted volume's ownership) then drop privileges to run the app.
RUN apk add --no-cache su-exec
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxtjs

# Copy built application
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./

# Embedded libSQL: copy the migration runner + committed SQL migrations so the
# database self-initializes on startup. The @libsql/client the runner imports is
# already bundled inside .output/server/node_modules by Nitro.
COPY --from=builder --chown=nuxtjs:nodejs /app/scripts/migrate-runtime.mjs ./scripts/migrate-runtime.mjs
COPY --from=builder --chown=nuxtjs:nodejs /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=builder --chown=nuxtjs:nodejs /app/server/db/migrations ./server/db/migrations
RUN chmod +x ./scripts/docker-entrypoint.sh && mkdir -p /app/.data && chown -R nuxtjs:nodejs /app/.data

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# Embedded, file-based libSQL persisted on a mounted volume (see docker-compose /
# Dokploy volume mapping for /app/.data).
ENV LIBSQL_URL="file:/app/.data/events.db"

# The database lives here — mount a volume so it survives redeploys.
VOLUME ["/app/.data"]

# NOTE: the container starts as root so the entrypoint can chown the (root-owned)
# mounted volume, then drops to the nuxtjs user via su-exec before running the app.

# Health check — single line so the Dockerfile parser doesn't choke on the script.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "require('http').get({host:'localhost',port:process.env.PORT||3000,path:'/api/health',timeout:3000},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

EXPOSE 3000

# Migrate the embedded database, then start the server.
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]