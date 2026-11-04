# Multi-stage Dockerfile for @logisphere/web-app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY frontend/web-app/package.json ./frontend/web-app/

# Install dependencies
RUN npm ci --workspace=@logisphere/web-app --include-workspace-root

# Copy frontend source files
COPY frontend/web-app/ ./frontend/web-app/

# Build production assets using Vite
RUN npm run build --workspace=@logisphere/web-app

# Production stage using Nginx
FROM nginx:1.25-alpine AS runner

# Copy custom nginx configuration
COPY frontend/web-app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA static files from builder stage
COPY --from=builder /app/frontend/web-app/dist /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["nginx", "-g", "daemon off;"]
