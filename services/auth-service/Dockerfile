# Multi-stage Dockerfile for @logisphere/auth-service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY services/auth-service/package.json ./services/auth-service/
COPY shared/common-utils/package.json ./shared/common-utils/
COPY shared/logger/package.json ./shared/logger/
COPY shared/event-contracts/package.json ./shared/event-contracts/

# Install workspace dependencies
RUN npm ci --workspace=@logisphere/auth-service --include-workspace-root

# Copy shared code & auth-service Prisma schema
COPY shared/ ./shared/
COPY services/auth-service/prisma/ ./services/auth-service/prisma/

# Generate Prisma client
RUN npx prisma generate --schema=./services/auth-service/prisma/schema.prisma

# Copy source code and scripts
COPY services/auth-service/src/ ./services/auth-service/src/
COPY services/auth-service/scripts/ ./services/auth-service/scripts/

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5001

# Run as non-root user node
USER node

# Copy built artifacts from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/shared ./shared
COPY --chown=node:node --from=builder /app/services/auth-service ./services/auth-service

EXPOSE 5001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

CMD ["node", "services/auth-service/src/server.js"]
