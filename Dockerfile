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
RUN bun install --frozen-lockfile --production=false

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server

# Build the application
RUN bun run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxtjs

# Copy built application
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Security: don't run as root
USER nuxtjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node --input-type=module --eval "
    import http from 'http';
    const options = {
      host: 'localhost',
      port: process.env.PORT || 3000,
      path: '/api/health',
      timeout: 2000,
    };
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) process.exit(0);
      else process.exit(1);
    });
    req.on('error', () => process.exit(1));
    req.end();
  "

EXPOSE 3000

CMD ["node", "server/index.mjs"]