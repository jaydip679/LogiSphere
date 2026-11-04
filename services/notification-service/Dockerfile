# Multi-stage Dockerfile for @logisphere/notification-service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY services/notification-service/package.json ./services/notification-service/
COPY shared/common-utils/package.json ./shared/common-utils/
COPY shared/logger/package.json ./shared/logger/
COPY shared/event-contracts/package.json ./shared/event-contracts/

# Install workspace dependencies
RUN npm ci --workspace=@logisphere/notification-service --include-workspace-root

# Copy shared code & notification-service Prisma schema
COPY shared/ ./shared/
COPY services/notification-service/prisma/ ./services/notification-service/prisma/

# Generate Prisma client
RUN npx prisma generate --schema=./services/notification-service/prisma/schema.prisma

# Copy source code
COPY services/notification-service/src/ ./services/notification-service/src/

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5005

# Run as non-root user node
USER node

# Copy built artifacts from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/shared ./shared
COPY --chown=node:node --from=builder /app/services/notification-service ./services/notification-service

EXPOSE 5005

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5005/health || exit 1

CMD ["node", "services/notification-service/src/server.js"]
