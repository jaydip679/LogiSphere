# LogiSphere — Auth & Organization Service

## 1. Overview

The **Auth & Organization Service** is the authoritative service for users, credentials, role-based access control (RBAC), organization workspaces, logistics company onboarding, and platform administration.

## 2. Responsibilities

- User registration (`INDIVIDUAL` and `BUSINESS` customers).
- Logistics company self-registration and onboarding (`PENDING_REVIEW` state).
- Platform Admin approval, rejection, and suspension of logistics companies.
- RS256 asymmetric JWT access token issuance (15-min TTL) and refresh token rotation/revocation (7-day TTL).
- Token reuse detection: automatic termination of all sessions if a revoked refresh token is presented.
- Organization staff and driver provisioning with mandatory temporary password change on first login.
- Internal service endpoint protection (`X-Internal-Service-Key`) for inter-service queries such as coverage lookups.
- Append-only security audit log recording administrative and authentication events.

## 3. Technology Stack

- **Runtime:** Node.js + Express
- **Language:** Modern JavaScript (ES6+, no TypeScript)
- **Database:** PostgreSQL (dedicated `auth` schema) via Prisma ORM
- **Cryptography:** RS256 (RSA 2048-bit) for JWT, bcrypt for password hashing
- **Validation:** Zod schemas

## 4. Environment Variables

| Variable                  | Description                                         | Default                                                                |
| ------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `PORT`                    | HTTP port                                           | `5001`                                                                 |
| `DATABASE_URL`            | PostgreSQL connection string                        | `postgresql://postgres:postgres@localhost:5432/logisphere?schema=auth` |
| `JWT_PRIVATE_KEY_PATH`    | Relative path to RSA private signing key            | `secrets/jwt-private.key`                                              |
| `JWT_PUBLIC_KEY_PATH`     | Relative path to shared RSA public verification key | `../../shared/keys/jwt-public.key`                                     |
| `JWT_ACCESS_EXPIRY`       | Access token TTL                                    | `15m`                                                                  |
| `JWT_REFRESH_EXPIRY_DAYS` | Refresh token TTL                                   | `7`                                                                    |
| `INTERNAL_SERVICE_KEY`    | Secret for internal service-to-service calls        | `dev_internal_secret_key`                                              |

## 5. API Endpoints

### Public Authentication (`/api/v1/auth`)

- `POST /register/customer` — Register individual or business customer
- `POST /login` — Authenticate and receive JWT token pair
- `POST /refresh` — Rotate refresh token and receive new access token
- `POST /logout` — Revoke refresh token

### Protected User Actions (`/api/v1/auth`)

- `GET /profile` — Retrieve current authenticated user profile
- `POST /change-password` — Update user password

### Organization Operations (`/api/v1/organizations`)

- `POST /register/company` — Public company registration
- `GET /me` — Current user's organization profile and members
- `POST /staff` — Company Owner / Logistics Manager adds staff/drivers

### Platform Administration (`/api/v1/admin`)

- `GET /organizations/pending` — List companies awaiting approval
- `GET /organizations/:id` — Inspect organization registration details
- `POST /organizations/:id/review` — Approve or reject company registration

### Internal Inter-Service (`/internal`)

- `GET /organizations/coverage?hub=Mumbai` — Retrieve approved companies serving a hub (requires `X-Internal-Service-Key`)
- `GET /organizations/:id` — Retrieve organization details for internal service verification
