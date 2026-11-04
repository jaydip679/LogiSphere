# LogiSphere — Tracking Service & GPS Route Simulator (`tracking-service`)

## Overview

The **Tracking Service & GPS Route Simulator** provides an append-only tracking timeline, driver and system milestone ingestion from SQS (`logisphere-tracking-queue`), a deterministic GPS route simulator for demonstration across major Indian hub corridors, and public/customer tracking query APIs.

## Architecture & Integration Contracts

- **Database Schema:** PostgreSQL `tracking` schema (`TrackingEvent`, `SimulatedRoutePoint`, `ProcessedEvent`).
- **Append-Only Invariant:** Tracking event records can never be updated or deleted once committed to the timeline.
- **Event SQS Consumer:**
  - Consumes from `logisphere-tracking-queue` (`ShipmentPickedUp`, `ShipmentInTransit`, `ShipmentDelayed`, `ShipmentOutForDelivery`, `ShipmentDelivered`, `DeliveryFailed`, `ShipmentCancelled`).
  - Deduplicates events using `eventId` in `processed_events`.
- **GPS Route Simulator:**
  - Calculates geodetic intermediate waypoints between Indian hubs (Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai).
  - Explicitly tags points with `source: "SIMULATOR"` to clearly distinguish from driver milestones.
- **Public & Internal APIs:**
  - `GET /api/v1/tracking/:trackingNumber`: Public/customer query returning chronological timeline, latest status, and ETA.
  - `POST /api/v1/tracking/:trackingNumber/simulate`: Trigger route simulation for demonstration.
  - `POST /internal/tracking/events`: Direct inter-service milestone ingestion (`X-Internal-Service-Key`).
  - `GET /internal/tracking/:trackingNumber`: Internal tracking query (`X-Internal-Service-Key`).
