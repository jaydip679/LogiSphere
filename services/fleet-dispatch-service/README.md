# LogiSphere — Fleet & Dispatch Management Service (`fleet-dispatch-service`)

## Overview

The **Fleet & Dispatch Management Service** is responsible for managing driver rosters, vehicle registrations and capacity constraints, 1-to-1 operational dispatch assignments, reassignment audit history, two-phase dispatch reservation protocol, and consuming fleet domain events via SQS (`logisphere-fleet-queue`).

## Architecture & Integration Contracts

- **Database Schema:** PostgreSQL `fleet` schema (`Driver`, `Vehicle`, `DispatchAssignment`, `AssignmentReservation`, `ProcessedEvent`, `IdempotencyRecord`).
- **Internal APIs (`X-Internal-Service-Key`):**
  - `GET /internal/fleet/capacity?organizationId=...`: Used by `shipment-service` matching engine to determine available capacity.
  - `POST /internal/assignments/reserve`: Two-phase reservation protocol (2-min timeout).
  - `POST /internal/assignments/confirm`: Promotes reservation to active assignment and sets driver `ON_DUTY` and vehicle `IN_USE`.
  - `POST /internal/assignments/cancel`: Compensation rollback.
  - `POST /internal/assignments/release-by-shipment/:shipmentId`: Synchronously releases assignment before shipment cancellation.
- **Roster & Dispatch APIs (Bearer JWT):**
  - `POST /api/v1/fleet/drivers`, `GET /api/v1/fleet/drivers`, `PATCH /api/v1/fleet/drivers/:id/status`
  - `POST /api/v1/fleet/vehicles`, `GET /api/v1/fleet/vehicles`, `PATCH /api/v1/fleet/vehicles/:id/status`
  - `GET /api/v1/fleet/dispatch/available`
  - `POST /api/v1/fleet/dispatch/assign` (Strict 1-to-1 active assignment, capacity checks)
  - `POST /api/v1/fleet/dispatch/reassign` (Mandatory operational reason recorded, history preserved)
  - `GET /api/v1/fleet/dispatch/history/:shipmentId`
- **Workers:**
  - `ReservationTimeoutWorker`: Automatically expires orphaned `PENDING` reservations every 30s.
  - `FleetEventConsumer`: Consumes `ShipmentDelivered`, `DeliveryFailed`, and `ShipmentCancelled` from `logisphere-fleet-queue` and releases active assignments.
