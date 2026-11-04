# Multi-stage Dockerfile for @logisphere/api-gateway
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY services/api-gateway/package.json ./services/api-gateway/
COPY shared/common-utils/package.json ./shared/common-utils/
COPY shared/logger/package.json ./shared/logger/
COPY shared/event-contracts/package.json ./shared/event-contracts/

# Install workspace dependencies
RUN npm ci --workspace=@logisphere/api-gateway --include-workspace-root

# Copy shared code & public keys
COPY shared/ ./shared/

# Copy gateway source code
COPY services/api-gateway/src/ ./services/api-gateway/src/

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Run as non-root user node
USER node

# Copy built artifacts from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/shared ./shared
COPY --chown=node:node --from=builder /app/services/api-gateway ./services/api-gateway

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "services/api-gateway/src/server.js"]
