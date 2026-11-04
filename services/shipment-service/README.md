# LogiSphere — Shipment Service & Marketplace Matching Engine

## 1. Overview

The **Shipment Service** is the core domain authority for the shipment lifecycle, customer shipment requests, Indian geocoding and pricing estimation, deterministic marketplace matching, company quote negotiations, and transactional outbox event publishing.

## 2. Responsibilities

- **Shipment Request Lifecycle:** Manages `CREATED` → `CONFIRMED` → `ASSIGNED` → `PICKED_UP` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`, plus exception states (`DELAYED`, `DELIVERY_FAILED`, `RETURNED`, `CANCELLED`, `UNMATCHED`).
- **Indian Geocoding & Pricing Engine:** Resolves PIN codes to 5 major logistics hubs (Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai). Calculates estimated distance via the Haversine formula and rates in integer paise.
- **Deterministic Marketplace Matching:** Identifies approved logistics carriers via internal Auth Service API and capacity via Fleet Service. Ranks candidates deterministically and creates sequential 15-minute offers with concurrency locks.
- **Offer Polling Worker:** Background worker polling expired offers every 30s to cascade matching to the next eligible carrier.
- **Revised Quote Workflow:** 24-hour customer window to accept or decline revised quotes.
- **Two-Phase Dispatch Orchestration:** Coordinates driver/vehicle reservation with Fleet Service.
- **Transactional Outbox Publisher:** Persists domain events atomically within the shipment database transaction and dispatches them asynchronously to LocalStack / AWS SQS queues.
- **Temporary Report Generation:** Generates CSV exports with strict 5-minute auto-deletion worker.

## 3. Technology Stack

- **Runtime:** Node.js + Express
- **Language:** Modern JavaScript (ES6+, no TypeScript)
- **Database:** PostgreSQL (dedicated `shipment` schema) via Prisma ORM
- **Messaging:** AWS SQS / LocalStack SQS (`@aws-sdk/client-sqs`)
- **Validation:** Zod schemas

## 4. API Endpoints

### Customer & Public Endpoints (`/api/v1/shipments`)

- `POST /estimate-price` — Calculate estimated distance and rate without creating record
- `POST /` — Create shipment request (supports `Idempotency-Key` header)
- `GET /` — List customer shipments with status filtering and pagination
- `GET /:id` — Detailed view of shipment
- `POST /:id/cancel` — Cancel shipment (enforces stage rules and fleet release)
- `POST /:id/retry-matching` — Re-trigger matching for `UNMATCHED` shipments
- `POST /:id/quotes/:quoteId/respond` — Accept or reject revised company quote

### Logistics Company Endpoints (`/api/v1/shipments`)

- `GET /offers/inbox` — Active 15-minute offers for the organization
- `POST /offers/:offerId/accept` — Accept offer at estimated price (moves to `CONFIRMED`)
- `POST /offers/:offerId/reject` — Decline offer (cascades to next company)
- `POST /offers/:offerId/quote` — Submit revised quote
- `POST /:id/assign` — Assign driver & vehicle (orchestrates with Fleet Service)
- `POST /:id/failure-disposition` — Manager schedules re-attempt (max 3) or initiates return

### Driver Endpoints (`/api/v1/shipments`)

- `GET /driver/assigned` — List active assignments
- `POST /:id/milestones` — Submit milestone update (`PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`, `DELAYED`, `RESUME_FROM_DELAY`)

### Reports (`/api/v1/reports`)

- `POST /export` — Generate CSV shipment summary
- `GET /:id/download` — Stream temporary CSV file within 5 minutes
