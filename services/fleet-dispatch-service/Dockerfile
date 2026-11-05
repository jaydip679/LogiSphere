# Multi-stage Dockerfile for @logisphere/fleet-dispatch-service
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma engine detection on Alpine Linux
RUN apk add --no-cache openssl

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY services/fleet-dispatch-service/package.json ./services/fleet-dispatch-service/
COPY shared/common-utils/package.json ./shared/common-utils/
COPY shared/logger/package.json ./shared/logger/
COPY shared/event-contracts/package.json ./shared/event-contracts/

# Install workspace dependencies
RUN npm ci --workspace=@logisphere/fleet-dispatch-service --include-workspace-root

# Copy shared code & fleet-dispatch-service Prisma schema
COPY shared/ ./shared/
COPY services/fleet-dispatch-service/prisma/ ./services/fleet-dispatch-service/prisma/

# Generate Prisma client
RUN npx prisma generate --schema=./services/fleet-dispatch-service/prisma/schema.prisma

# Copy source code
COPY services/fleet-dispatch-service/src/ ./services/fleet-dispatch-service/src/

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5003

# Install openssl runtime library required by Prisma on Alpine Linux
RUN apk add --no-cache openssl

# Run as non-root user node
USER node

# Copy built artifacts from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/shared ./shared
COPY --chown=node:node --from=builder /app/services/fleet-dispatch-service ./services/fleet-dispatch-service

EXPOSE 5003

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5003/health || exit 1

CMD ["node", "services/fleet-dispatch-service/src/server.js"]
