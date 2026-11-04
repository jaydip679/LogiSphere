# LogiSphere — Notification Service & Event Reliability (`notification-service`)

## Overview

The **Notification Service & Event Reliability** system is responsible for consuming all domain events published across the LogiSphere platform via SQS (`logisphere-notification-queue`), generating in-app notifications for customers and company personnel, managing configurable email notifications (with development mock transport fallback), guaranteeing idempotent event processing, and routing exhausted poisoned messages to the Dead-Letter Queue (`logisphere-notification-dlq`).

## Architecture & Integration Contracts

- **Database Schema:** PostgreSQL `notification` schema (`InAppNotification`, `NotificationLog`, `ProcessedEvent`).
- **SQS Consumer:**
  - Consumes from `logisphere-notification-queue`.
  - Formats user notifications for 13+ lifecycle and marketplace events (`ShipmentCreated`, `OfferCreated`, `OfferAccepted`, `QuoteSubmitted`, `QuoteAccepted`, `DriverAssigned`, `PickedUp`, `InTransit`, `Delayed`, `OutForDelivery`, `Delivered`, `Failed`, `Cancelled`).
  - Idempotent deduplication against `processed_events`.
  - Max 3 retries before dead-letter routing to `logisphere-notification-dlq`.
- **Configurable Email Handler:**
  - Uses Nodemailer transport with SMTP if configured.
  - Automatically falls back to formatted mock logger in dev/test mode.
  - Non-blocking and failsafe: email failures never crash SQS consumption.
- **REST APIs (Bearer JWT):**
  - `GET /api/v1/notifications`: Paginated in-app notifications.
  - `GET /api/v1/notifications/unread-count`: Quick badge count for UI navbar.
  - `PATCH /api/v1/notifications/:id/read`: Mark single notification as read.
  - `PATCH /api/v1/notifications/read-all`: Mark all notifications as read.
  - `POST /internal/notifications/in-app`: Internal in-app notification dispatch.
  - `POST /internal/notifications/email`: Internal email dispatch.
