# Multi-stage Dockerfile for centralized database migrations and admin seeding
FROM node:20-alpine AS builder

WORKDIR /app

# Install native build tools for compiling native dependencies like bcrypt
RUN apk add --no-cache python3 make g++

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY services/auth-service/package.json ./services/auth-service/
COPY services/shipment-service/package.json ./services/shipment-service/
COPY services/fleet-dispatch-service/package.json ./services/fleet-dispatch-service/
COPY services/tracking-service/package.json ./services/tracking-service/
COPY services/notification-service/package.json ./services/notification-service/
COPY shared/common-utils/package.json ./shared/common-utils/
COPY shared/logger/package.json ./shared/logger/
COPY shared/event-contracts/package.json ./shared/event-contracts/

# Install root dependencies including Prisma CLI and bcrypt
RUN npm ci

# Copy all Prisma schemas and migration histories
COPY services/auth-service/prisma/ ./services/auth-service/prisma/
COPY services/shipment-service/prisma/ ./services/shipment-service/prisma/
COPY services/fleet-dispatch-service/prisma/ ./services/fleet-dispatch-service/prisma/
COPY services/tracking-service/prisma/ ./services/tracking-service/prisma/
COPY services/notification-service/prisma/ ./services/notification-service/prisma/

# Generate Prisma clients for all services
RUN npx prisma generate --schema=./services/auth-service/prisma/schema.prisma && \
    npx prisma generate --schema=./services/shipment-service/prisma/schema.prisma && \
    npx prisma generate --schema=./services/fleet-dispatch-service/prisma/schema.prisma && \
    npx prisma generate --schema=./services/tracking-service/prisma/schema.prisma && \
    npx prisma generate --schema=./services/notification-service/prisma/schema.prisma

# Production runner stage (keeps runtime lightweight without python3/make/g++)
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built node_modules and manifests from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy all Prisma schemas and migration histories from builder
COPY --from=builder /app/services ./services

# Copy shared code, migration scripts, and seed scripts
COPY shared/ ./shared/
COPY scripts/ ./scripts/
COPY services/auth-service/scripts/ ./services/auth-service/scripts/
COPY services/auth-service/src/ ./services/auth-service/src/

CMD ["sh", "-c", "node scripts/migrate-all.js && node services/auth-service/scripts/seedAdmin.js"]
