# Multi-stage Dockerfile for @logisphere/shipment-service
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma engine detection on Alpine Linux
RUN apk add --no-cache openssl

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY services/shipment-service/package.json ./services/shipment-service/
COPY shared/common-utils/package.json ./shared/common-utils/
COPY shared/logger/package.json ./shared/logger/
COPY shared/event-contracts/package.json ./shared/event-contracts/

# Install workspace dependencies
RUN npm ci --workspace=@logisphere/shipment-service --include-workspace-root

# Copy shared code & shipment-service Prisma schema
COPY shared/ ./shared/
COPY services/shipment-service/prisma/ ./services/shipment-service/prisma/

# Generate Prisma client
RUN npx prisma generate --schema=./services/shipment-service/prisma/schema.prisma

# Copy source code
COPY services/shipment-service/src/ ./services/shipment-service/src/

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5002

# Install openssl runtime library required by Prisma on Alpine Linux
RUN apk add --no-cache openssl

# Create temp reports directory with correct ownership
RUN mkdir -p /app/services/shipment-service/temp_reports && chown -R node:node /app

# Run as non-root user node
USER node

# Copy built artifacts from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/shared ./shared
COPY --chown=node:node --from=builder /app/services/shipment-service ./services/shipment-service

EXPOSE 5002

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5002/health || exit 1

CMD ["node", "services/shipment-service/src/server.js"]
