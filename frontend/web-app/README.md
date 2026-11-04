# LogiSphere — Web Application (`@logisphere/web-app`)

Modern, responsive React web application and public SaaS landing page for LogiSphere, India's connected logistics & supply chain platform.

## Features

- **Public SaaS Landing Page:** Modern light-theme design inspired by contemporary logistics platforms, presenting platform pillars, core capabilities, interactive product previews, user-specific solutions, and India-first routing.
- **Role-Based Portals:**
  - Customer Portal (Shipment booking, PIN code pricing, tracking timeline)
  - Logistics Company Portal (Offer inbox, dispatch management, fleet capacity)
  - Driver View (Consignment milestones, delivery confirmation)
  - Platform Admin (Company vetting, operational governance)
- **Live Tracking:** Public and authenticated consignment tracking with milestone progress and corridor telemetry.

## Technology Stack

- **Framework:** React 18 (JavaScript ES6+, JSX)
- **Bundler:** Vite 5
- **Styling:** Tailwind CSS 3
- **Icons:** Lucide React
- **Routing:** React Router v6

## Running Locally

```bash
# From repository root
npm run dev --workspace=@logisphere/web-app

# Or directly from frontend/web-app
cd frontend/web-app
npm run dev
```
