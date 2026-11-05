# Dedicated Dockerfile for centralized database migrations and admin seeding
FROM node:20-alpine

WORKDIR /app

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

# Copy shared code, migration scripts, and seed scripts
COPY shared/ ./shared/
COPY scripts/ ./scripts/
COPY services/auth-service/scripts/ ./services/auth-service/scripts/
COPY services/auth-service/src/ ./services/auth-service/src/

# Generate Prisma clients for all services
RUN npx prisma generate --schema=./services/auth-service/prisma/schema.prisma && \
    npx prisma generate --schema=./services/shipment-service/prisma/schema.prisma && \
    npx prisma generate --schema=./services/fleet-dispatch-service/prisma/schema.prisma && \
    npx prisma generate --schema=./services/tracking-service/prisma/schema.prisma && \
    npx prisma generate --schema=./services/notification-service/prisma/schema.prisma

CMD ["sh", "-c", "node scripts/migrate-all.js && node services/auth-service/scripts/seedAdmin.js"]
