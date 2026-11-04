# Multi-stage Dockerfile for @logisphere/tracking-service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY services/tracking-service/package.json ./services/tracking-service/
COPY shared/common-utils/package.json ./shared/common-utils/
COPY shared/logger/package.json ./shared/logger/
COPY shared/event-contracts/package.json ./shared/event-contracts/

# Install workspace dependencies
RUN npm ci --workspace=@logisphere/tracking-service --include-workspace-root

# Copy shared code & tracking-service Prisma schema
COPY shared/ ./shared/
COPY services/tracking-service/prisma/ ./services/tracking-service/prisma/

# Generate Prisma client
RUN npx prisma generate --schema=./services/tracking-service/prisma/schema.prisma

# Copy source code
COPY services/tracking-service/src/ ./services/tracking-service/src/

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5004

# Run as non-root user node
USER node

# Copy built artifacts from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/shared ./shared
COPY --chown=node:node --from=builder /app/services/tracking-service ./services/tracking-service

EXPOSE 5004

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5004/health || exit 1

CMD ["node", "services/tracking-service/src/server.js"]
