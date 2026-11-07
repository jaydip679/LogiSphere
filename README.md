# 🌐 LogiSphere — Cloud-Native Logistics & Supply Chain Orchestration Platform

LogiSphere is an enterprise-grade, B2B2C logistics and supply chain orchestration platform that connects individual and business shippers with vetted logistics carriers. Designed India-first (incorporating 6-digit Indian PIN codes, transit hubs, INR paise pricing, and domestic phone formats), the platform features an **intelligent 15-minute cascade marketplace matching engine**, **atomic 2-minute fleet dispatch reservations**, **real-time milestone-based GPS tracking simulation**, and **reliable event-driven notifications**.

Built with **React 18, Vite, Node.js, Express, Neon Serverless PostgreSQL, Prisma ORM, AWS SQS, Docker, Render, and Vercel**, LogiSphere emphasizes strict microservice domain boundaries, event-driven decoupling, zero cross-schema database queries, asymmetric cryptographic security, and cloud-native memory efficiency.

### 🔗 Links

- 🌐 **Live Demo (Frontend):** [https://logisphereapp.vercel.app](https://logisphereapp.vercel.app)
- ⚡ **API Gateway (Backend):** [https://logisphere-api.onrender.com/health](https://logisphere-api.onrender.com/health)
- 🐙 **GitHub Repository:** [https://github.com/jaydip679/LogiSphere](https://github.com/jaydip679/LogiSphere)

<br>

## 🛠️ Technology Stack

| Category                   | Technology                                                                                                   |
| :------------------------- | :----------------------------------------------------------------------------------------------------------- |
| 🎨 **Frontend**            | React 18, Vite, Tailwind CSS, Lucide React, React Router 6, TanStack Query Polling                           |
| ⚙️ **Backend**             | Node.js 20+, Express.js (Microservices Architecture)                                                         |
| 🚪 **API Gateway**         | Express Reverse Proxy, Request Correlation IDs, Route Shielding, Rate Limiting                               |
| 🗄️ **Database**            | Neon Serverless PostgreSQL (5 Isolated Schemas: `app_auth`, `shipment`, `fleet`, `tracking`, `notification`) |
| 🔗 **ORM & Migrations**    | Prisma ORM (Independent schemas, Prisma Client factories, centralized migration runner)                      |
| 🔐 **Authentication**      | Asymmetric RS256 JWT (Private key held strictly in `auth-service`, public key downstream)                    |
| 📬 **Messaging & Queue**   | AWS SQS (`ap-south-1`) with dedicated Dead-Letter Queues (LocalStack 3.0 for local dev)                      |
| 🔄 **Reliability**         | Transactional Outbox Pattern with automatic background polling publisher                                     |
| 📧 **Notifications**       | Gmail REST API (OAuth 2.0) with automated fallback mock provider                                             |
| 📊 **Logging & Telemetry** | Structured Winston JSON logger, active memory telemetry (`/proc/status` RSS monitor)                         |
| 🐳 **DevOps & Containers** | Docker, Multi-stage Dockerfiles (non-root `node`), Docker Compose, GitHub Actions                            |
| 🌍 **Deployment**          | Vercel (Edge CDN Frontend), Render (Unified In-Process Microservices Backend)                                |
| 🧪 **Automated Testing**   | Jest, Supertest (146+ unit tests across all workspaces + 40-assertion E2E test suite)                        |

<br>

## 🏗️ System Architecture

LogiSphere follows a decentralized cloud-native microservices architecture. Client traffic enters exclusively through the **API Gateway** over TLS, which validates tokens, injects correlation IDs, shields internal routes (`/internal/*` blocked with 404), and proxies requests to isolated domain services over internal loopback. Asynchronous domain events are routed via **AWS SQS** through dedicated consumer queues.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT & FRONTEND LAYER                                 │
│                                                                                        │
│                          React 18 + Vite + Tailwind CSS (Vercel)                       │
│                                                                                        │
│   Landing Page • Consignment Tracking • Customer Portal • Carrier Desk • Admin Console │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │  HTTPS / Bearer JWT
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PUBLIC INGRESS & API GATEWAY                              │
│                                                                                        │
│                        Express Reverse Proxy (:10000 / Render)                         │
│                                                                                        │
│   CORS Enforcement • RS256 Pre-Validation • Correlation IDs • Internal Route Shielding  │
└───────┬───────────────────┬───────────────────┬───────────────────┬────────────────────┘
        │                   │                   │                   │
        │ HTTP (127.0.0.1)  │ HTTP (127.0.0.1)  │ HTTP (127.0.0.1)  │ HTTP (127.0.0.1)
        ▼                   ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌────────────────┐
│  Auth Service │   │Shipment Serv. │   │ Fleet Service │   │Tracking Serv. │   │ Notification   │
│    (:5001)    │   │    (:5002)    │   │    (:5003)    │   │    (:5004)    │   │    (:5005)     │
│               │   │               │   │               │   │               │   │                │
│ • RBAC Auth   │   │ • Lifecycle   │   │ • Fleet Reg.  │   │ • Waypoints   │   │ • SQS Consumer │
│ • Multi-Tenant│   │ • Cascade Eng.│   │ • Atomic Res. │   │ • GPS Sim.    │   │ • In-App Inbox │
│ • RS256 Sign  │   │ • Haversine   │   │ • Capacity    │   │ • Chronology  │   │ • Gmail OAuth  │
│ • Onboarding  │   │ • Outbox Pub. │   │ • 2-min Lock  │   │ • Idempotent  │   │ • DLQ Redrive  │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘   └────────┬───────┘
        │                   │                   │                   │                    │
        │                   │ Transactional     │ SQS Consumer      │ SQS Consumer       │ SQS Consumer
        │                   │ Outbox Events     │                   │                    │
        │                   ▼                   ▼                   ▼                    ▼
        │         ┌────────────────────────────────────────────────────────────────────────┐
        │         │              EVENT BUS & MESSAGING LAYER (AWS SQS)                     │
        │         │                                                                        │
        │         │ • logisphere-fleet-queue        (+ DLQ & redrive)                      │
        │         │ • logisphere-tracking-queue     (+ DLQ & redrive)                      │
        │         │ • logisphere-notification-queue (+ DLQ & redrive)                      │
        └──────┐  └────────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DATA PERSISTENCE LAYER (Neon PostgreSQL)                        │
│                                                                                        │
│               Universal Multi-Schema Isolation (Zero Cross-Schema Joins)               │
│                                                                                        │
│   Schema: app_auth │ Schema: shipment │ Schema: fleet │ Schema: tracking │ Schema: notif │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

<br>

## ✨ Project Highlights

- ⏱️ **15-Minute Cascade Matching Engine:** Broadcasts orders sequentially to qualified carriers with a strict 15-minute response window before cascading to next-best carriers.
- 🔒 **2-Minute Atomic Fleet Dispatch:** Prevents vehicle and driver double-booking via atomic 2-minute pending reservations with automatic background expiration and rollback.
- 📐 **Haversine Distance & Dynamic Pricing:** India-specific hub-to-hub matrix (Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai) calculated in integer paise to eliminate floating-point rounding errors.
- 🛰️ **Waypoint Route Simulator:** Simulates real-time transit telemetry along major Indian freight corridors with dynamic progress projection and milestone mapping.
- ⚡ **High-Efficiency In-Process Supervisor:** Runs all 6 backend services in an embedded Node.js process on Render, cutting RAM from **614 MB down to ~132 MB (26%)** without breaking microservice port boundaries.
- 🛡️ **Asymmetric Cryptography (RS256):** Private RSA key is strictly locked inside `auth-service`; all downstream services verify tokens using a decoupled public key.
- 📦 **Transactional Outbox Pattern:** Guarantees reliable event publishing to AWS SQS without dual-write inconsistencies during database transactions.
- 🗄️ **Zero Cross-Schema Queries:** Five isolated PostgreSQL schemas (`app_auth`, `shipment`, `fleet`, `tracking`, `notification`) with independent Prisma migrations.
- 📄 **Ephemeral CSV Reporting:** On-demand analytics reports delivered with signed tokens and automatically deleted by a background worker after a 5-minute TTL.
- 🧪 **Enterprise Test Suite:** 146+ unit tests across all workspace packages and a 40-assertion master E2E integration runner exercising the full end-to-end business flow.

<br>

## 🧭 Core Portals & User Roles

LogiSphere provides a unified web experience with role-based portal routing:

- **👑 Platform Administrator (`PLATFORM_ADMIN`)**  
  Review and approve pending carrier onboarding applications, inspect system-wide consignment volumes, verify carrier compliance, and monitor infrastructure health.

- **🏢 Logistics Carrier Owner (`COMPANY_OWNER`)**  
  Carrier dashboard to review broadcasted marketplace consignment offers, accept/decline within the 15-minute countdown window, and monitor company revenue.

- **📋 Logistics Dispatcher (`DISPATCHER`)**  
  Operational control center to manage trucks, assign active drivers, and execute 2-minute atomic dispatch reservations against accepted consignments.

- **🚚 Delivery Driver (`DRIVER`)**  
  Mobile-responsive cockpit for drivers to accept dispatches, inspect cargo details, and advance shipment milestones (`PICKED_UP` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`).

- **📦 Shippers & Customers (`CUSTOMER`)**
  - **Individual:** Instant shipping rate calculation, doorstep pickup scheduling, and live tracking.
  - **Business:** High-volume consignment booking, organization billing, and downloadable CSV analytics reports.

- **🔍 Public Consignment Tracking (No Login Required)**  
  Instant public tracking page providing milestone chronologies, route visualizer, and estimated delivery dates.

<br>

## ⚙️ Engineering Deep Dives

---

### ⏱️ 15-Minute Cascade Marketplace Matching

When a shipment is booked, `shipment-service` scores eligible carriers based on service area coverage and available vehicle capacity retrieved via internal APIs (`GET /internal/organizations/coverage` and `GET /internal/fleet/capacity`). The top-ranked carrier receives an exclusive 15-minute acceptance window. A background polling worker runs every 30 seconds; if the carrier does not accept in time, the offer expires and cascades automatically to the next eligible carrier.

---

### 🔒 2-Minute Atomic Fleet Dispatch Reservations

Assigning a consignment requires reserving both a driver and a vehicle. To prevent race conditions in multi-dispatcher environments, `fleet-dispatch-service` creates a `PENDING` reservation holding the resources for exactly 2 minutes. When `shipment-service` confirms the assignment, the reservation transitions to `CONFIRMED`. If the reservation expires or is aborted, a background worker automatically releases the resources back to the pool.

---

### 🗄️ Universal Multi-Schema Cloud Database

To ensure clean domain separation and cloud portability across local Docker and Neon Serverless PostgreSQL, LogiSphere partitions data into 5 distinct logical schemas within a single database:

- `app_auth`: Users, organizations, refresh tokens, audit logs.
- `shipment`: Consignments, items, marketplace offers, transactional outbox.
- `fleet`: Vehicles, drivers, dispatch reservations, capacity logs.
- `tracking`: Milestone events, simulated GPS waypoints, telemetry logs.
- `notification`: In-app notification inbox, delivery receipts, dead-letter records.

---

### ⚡ Render In-Process Microservices Orchestration

To operate the entire backend on Render's 512 MB free tier, `scripts/render-orchestrator.js` mounts all 6 microservices within a single Node.js runtime with `--optimize-for-size --max-old-space-size=40`:

- Preserves distinct HTTP ports (`127.0.0.1:5001-5005` and `0.0.0.0:10000`).
- Internal services bind strictly to loopback (`127.0.0.1`), ensuring Render only opens port `10000`.
- Shared V8 memory drops total physical RSS from **~614 MB down to ~132 MB (26%)**, leaving abundant headroom.

---

### 🔐 Asymmetric Cryptographic JWT Security (RS256)

- The 2048-bit RSA **private key** is strictly confined to `auth-service` for token issuance.
- The API Gateway and downstream services consume only the **public key** (`jwt-public.key`) to cryptographically verify signatures and unpack tenant IDs and user roles independently.

<br>

## 💻 Local Development

LogiSphere can be launched locally using **Docker Compose** (recommended for complete multi-container orchestration) or manually via npm workspaces.

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** & **Docker Compose**

---

### 🐳 Docker Compose Setup (Recommended)

1. **Clone the repository:**

   ```bash
   git clone https://github.com/jaydip679/LogiSphere.git
   cd LogiSphere
   ```

2. **Generate RSA Keypair & Environment:**

   ```bash
   npm install
   npm run generate:keys
   cp .env.example .env
   ```

3. **Start the 10-Container Stack:**

   ```bash
   docker compose up -d --build
   ```

4. **Verify Health:**
   ```bash
   curl http://localhost:5000/health
   ```
   Open `http://localhost:3000` in your browser.

---

### 🛠️ Manual Workspaces Setup

1. **Install all workspace dependencies:**

   ```bash
   npm install
   ```

2. **Run database migrations across all 5 schemas:**

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run seed:admin
   ```

3. **Start the backend orchestrator:**

   ```bash
   npm start
   ```

4. **Start the frontend application:**
   ```bash
   npm run dev --workspace=@logisphere/web-app
   ```

<br>

## 🧪 Automated Testing

LogiSphere enforces automated testing across all workspaces:

```bash
# Run unit tests across all 6 services and shared packages (146+ tests)
npm run test

# Run code style & lint checks
npm run lint

# Run automated end-to-end integration test suite
npm run test:e2e
```

<br>

## 🔑 Demo Credentials

| Role                       | Email                                                                                               | Password                |
| :------------------------- | :-------------------------------------------------------------------------------------------------- | :---------------------- |
| **Platform Administrator** | `admin@logisphere.local`                                                                            | `Admin@LogiSphere2026!` |
| **New Customer / Carrier** | Register via [https://logisphereapp.vercel.app/register](https://logisphereapp.vercel.app/register) | Self-registered         |

<br>

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

## 👨‍💻 Author

**Jaydip Chaudhari**  
[GitHub](https://github.com/jaydip679) · [LinkedIn](https://linkedin.com/in/jaydip679)
