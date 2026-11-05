# LogiSphere

LogiSphere is an enterprise-grade, B2B2C logistics and supply chain orchestration platform that connects individual and business customers with vetted logistics carriers. The platform features an intelligent 15-minute cascade marketplace matching engine, atomic fleet dispatch management, real-time milestone-based GPS tracking, and reliable event-driven notifications.

---

## 1. System Architecture

LogiSphere is built as a cloud-native microservices architecture orchestrated via Docker Compose (and designed for Kubernetes/kind deployment):

```
                                  [ Web Application ]
                                   (React + Vite :3000)
                                            │
                                            ▼
                                   [ API Gateway ]
                              (Express Reverse Proxy :5000)
                                            │
         ┌──────────────────┬───────────────┼───────────────┬──────────────────┐
         ▼                  ▼               ▼               ▼                  ▼
  [ Auth Service ]  [ Shipment Service]  [ Fleet Service ]  [ Tracking Service]  [ Notification ]
       (:5001)           (:5002)             (:5003)             (:5004)             (:5005)
         │                  │                   │                   │                   │
         └──────────────────┼───────────────────┼───────────────────┼───────────────────┘
                            │                   │                   │
                            ▼                   ▼                   ▼
                  [ PostgreSQL 15 ]      [ LocalStack SQS ]    [ In-App Inbox ]
                 (5 Isolated Schemas)    (Async Event Bus)    (Failsafe Logger)
```

### Core Microservices

| Service                  | Port   | Database Schema | Primary Responsibilities                                                                                                                         |
| ------------------------ | ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **API Gateway**          | `5000` | N/A             | Reverse proxy routing, rate limiting, correlation IDs, RS256 JWT pre-validation, internal route shielding (`/internal/*`).                       |
| **Auth Service**         | `5001` | `auth`          | Multi-tenant auth, RS256 JWT issuance, organization onboarding, carrier compliance review, role-based access control.                            |
| **Shipment Service**     | `5002` | `shipment`      | Consignment lifecycle authority, Indian pin-code pricing engine, transactional outbox worker, 15-min marketplace matching engine, CSV reporting. |
| **Fleet & Dispatch**     | `5003` | `fleet`         | Vehicle & driver registry, capacity validation, 2-minute atomic dispatch reservations, reservation timeout worker.                               |
| **Tracking Service**     | `5004` | `tracking`      | Milestone timeline projections, Indian corridor waypoint simulator, idempotent SQS event consumer.                                               |
| **Notification Service** | `5005` | `notification`  | Multi-channel customer notifications, SQS consumer with dead-letter queue (DLQ) redrive, in-app notification inbox.                              |
| **Web Application**      | `3000` | N/A             | React 18 SPA with Tailwind CSS, Shipsy-inspired SaaS landing page, public tracking portal, and role-specific operational dashboards.             |

---

## 2. Supported User Roles & Portals

1. **Platform Administrator (`ADMIN`):** Approves/rejects carrier onboarding applications, monitors platform health, and views system-wide analytics.
2. **Logistics Company Owner (`COMPANY_OWNER`):** Manages carrier profile, reviews 15-minute marketplace broadcast offers, and assigns operational dispatchers and drivers.
3. **Logistics Dispatcher (`DISPATCHER`):** Manages vehicles and drivers, executes 2-minute atomic dispatch reservations against accepted consignments.
4. **Delivery Driver (`DRIVER`):** Mobile-optimized portal to review active assigned consignments, progress milestones (`PICKED_UP` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`), and report exceptions.
5. **Individual Customer (`CUSTOMER` - `INDIVIDUAL`):** Dynamic shipping fee calculation, booking consignments, and live milestone tracking with 6-second polling telemetry.
6. **Business Customer (`CUSTOMER` - `BUSINESS`):** High-volume bulk booking, organization billing, and downloadable CSV analytics reports with 5-minute auto-expiry.

---

## 3. Technology Stack

- **Backend:** Node.js (>= 18), Express, Prisma ORM (v5 multi-schema).
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons.
- **Database:** PostgreSQL 15 (5 isolated logical schemas: `auth`, `shipment`, `fleet`, `tracking`, `notification`).
- **Security:** Asymmetric RSA-256 JWT (private signing in Auth Service, public key verification downstream), bcrypt password hashing, correlation IDs.
- **Messaging:** Event-driven architecture with AWS SQS (emulated locally via LocalStack 3.0).
- **Containerization:** Multi-stage Dockerfiles (running as unprivileged `node` user), Nginx SPA frontend, Docker Compose orchestration with automated health checks.

---

## 4. Getting Started

### Prerequisites

- **Node.js** >= 18.0.0 and **npm** >= 9.0.0
- **Docker** and **Docker Compose**

### Step-by-Step Local Setup

#### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd LogiSphere
npm install
```

#### 2. Generate RSA-256 JWT Keypair

Auth Service requires an RSA private key to sign JWTs, and downstream services verify tokens with the public key:

```bash
npm run generate:keys
```

#### 3. Configure Environment Variables

Copy the root environment template:

```bash
cp .env.example .env
```

_(On Windows PowerShell, use: `Copy-Item .env.example .env`)_

#### 4. Launch Full Stack with Docker Compose

```bash
docker compose up -d --build
```

This starts all 10 containers in dependency order:

1. `postgres` (initializes database and health checks)
2. `localstack` (provisions SQS queues and dead-letter queues)
3. `db-migrate` (runs Prisma migrations across all 5 schemas and seeds the bootstrap Platform Admin)
4. Microservices (`auth-service`, `shipment-service`, `fleet-dispatch-service`, `tracking-service`, `notification-service`)
5. `api-gateway` (reverse proxy entry point)
6. `web-app` (frontend UI)

#### 5. Verify Stack Health

Check container status:

```bash
docker compose ps
```

Probe the API Gateway aggregated health check:

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{
  "status": "UP",
  "downstream": {
    "auth": "UP",
    "shipment": "UP",
    "fleet": "UP",
    "tracking": "UP",
    "notification": "UP"
  }
}
```

---

## 5. Automated Testing

### Linting & Formatting

```bash
# Check code style and lint rules
npm run lint

# Check Prettier formatting
npm run format:check
```

### End-to-End (E2E) Test Suite

Execute the comprehensive end-to-end test suite that exercises the entire business flow across all microservices:

```bash
npm run test:e2e
```

The test suite automates:

1. API Gateway aggregated downstream health verification.
2. Platform Admin sign-in.
3. Logistics carrier onboarding (`PENDING_REVIEW` → Admin `APPROVED`).
4. Driver staff provisioning and vehicle registration.
5. Customer registration and dynamic route price calculation.
6. Consignment creation and broadcast offer matching.
7. Carrier offer acceptance and atomic dispatch reservation.
8. Driver milestone progression (`PICKED_UP` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`).
9. Real-time tracking verification and customer in-app notification assertion.

---

## 6. Project Directory Layout

```
LogiSphere/
├── docker/                     # Dockerfiles & LocalStack initialization scripts
│   ├── migration.Dockerfile    # Consolidated multi-schema Prisma migration runner
│   └── localstack/             # SQS queue & DLQ provisioning scripts
├── frontend/
│   └── web-app/                # React 18 + Tailwind CSS single page application
├── scripts/
│   ├── e2e-test.js             # Full automated multi-role E2E test suite
│   ├── generate-jwt-keys.js    # RSA-256 keypair generator
│   └── migrate-all.js          # Centralized multi-schema Prisma migration runner
├── services/
│   ├── api-gateway/            # Port 5000 - Express reverse proxy
│   ├── auth-service/           # Port 5001 - Auth, RBAC & Organization management
│   ├── fleet-dispatch-service/ # Port 5003 - Vehicle, driver & atomic dispatch reservations
│   ├── notification-service/   # Port 5005 - Customer notifications & SQS consumer
│   ├── shipment-service/       # Port 5002 - Pricing, orders, marketplace matching engine
│   └── tracking-service/       # Port 5004 - Milestone timelines & waypoint simulation
├── shared/
│   ├── common-utils/           # Shared error handlers, responses, and Zod validators
│   ├── event-contracts/        # Shared SQS event schemas & routing keys
│   ├── keys/                   # Asymmetric JWT public key
│   └── logger/                 # Winston structured JSON logger
├── .env.example                # Root environment configuration reference
├── docker-compose.yml          # 10-container local orchestration configuration
└── package.json                # Monorepo workspaces & root scripts
```

---

## 7. Default Credentials (Local Development)

| Role                       | Email                                         | Password                  |
| -------------------------- | --------------------------------------------- | ------------------------- |
| **Platform Administrator** | `admin@logisphere.local`                      | `AdminSecurePassword123!` |
| **New Accounts**           | Register via `http://localhost:3000/register` | User defined              |
