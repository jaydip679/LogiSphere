# LogiSphere — API Gateway & Security Entry Point (`api-gateway`)

## Overview

The **API Gateway** is the single entry point for all client and frontend requests into the LogiSphere microservices ecosystem. It provides unified reverse proxying, CORS policy enforcement, rate limiting, request correlation IDs, JWT signature pre-validation, strict shielding of internal endpoints, and aggregated downstream health checks.

## Architecture & Responsibilities

- **Reverse Proxy Routing (`http-proxy-middleware`):**
  - `/api/v1/auth`, `/api/v1/organizations`, `/api/v1/admin` -> Auth Service (`:5001`)
  - `/api/v1/shipments`, `/api/v1/reports` -> Shipment Service (`:5002`)
  - `/api/v1/fleet` -> Fleet & Dispatch Service (`:5003`)
  - `/api/v1/tracking` -> Tracking Service (`:5004`)
  - `/api/v1/notifications` -> Notification Service (`:5005`)
- **Internal Route Shielding:**
  - All external requests targeting `/internal/*` or `/api/v1/internal/*` are immediately intercepted and return `404 Not Found`.
- **Security & Rate Limiting:**
  - Auth Limiter: 30 requests / 15 min per IP.
  - Tracking Limiter: 60 requests / min per IP.
  - General API Limiter: 120 requests / min per IP.
- **Request Tracing:**
  - Injects `X-Correlation-ID` on incoming requests and ensures it is propagated downstream to all microservices.
- **JWT Verification & Context Propagation:**
  - Verifies token signature using RSA public key (`shared/keys/jwt-public.key`).
  - Passes original Bearer token plus verified identity headers (`X-User-Id`, `X-User-Role`, `X-User-Org-Id`) downstream.
- **Aggregated Health Probe:**
  - `GET /health` probes `/health` on all 5 downstream services and reports unified health metrics.
