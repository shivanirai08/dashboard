# Instant Mechanic — Live Ops Dashboard

Operations dashboard for vehicle-service bookings: assign mechanics, track jobs, view analytics, and stay in sync with **real-time WebSocket updates**.

## Features

- **Overview** — KPIs, charts, recent bookings, live activity
- **Analytics** — range filters, status/service breakdowns, CSV export
- **Bookings** — search, filters, pagination, assign/reassign, status updates
- **Mechanics** — fleet list with status and job context
- **Customers** — accounts, vehicles, lifetime value
- **Realtime** — WebSocket events for creates/updates (no full page reload)
- **UX** — dark mode, loading/empty/error states, command palette

## Tech stack

| Layer | Stack |
|--------|--------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Recharts |
| Backend | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL |
| Realtime | Native WebSockets (`ws`) on `/ws` |
| API docs | Swagger / OpenAPI at `/api/docs` |

## Architecture

```
Browser (Next.js)
   │  REST
   │  WebSocket
   ▼
Express API
   │  Prisma
   ▼
PostgreSQL
```

Writes (booking create/reassign/status, customer/mechanic create) persist to Postgres, then `broadcast()` a JSON event on `/ws`. Connected dashboards refresh silently.

HTTP and WebSocket share the same server port.

## Project layout

```
dashboard/
  frontend/    Next.js app
  backend/     Express + Prisma + WebSocket
```

## Prerequisites

- Node.js 20+
- PostgreSQL

## Setup

### Backend

```bash
cd backend
cp .env.example .env   # set DATABASE_URL (and optional PORT, CORS_ORIGIN)
npm install
npx prisma db push
npm run db:seed
npm run dev            # http://localhost:4000  ·  ws://localhost:4000/ws
```

API docs: `http://localhost:4000/api/docs`

### Frontend

```bash
cd frontend
# create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:4000

npm install
npm run dev            # http://localhost:3000
```

Open two browser windows, create a booking in one — the other should notify and refresh without a full reload.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `PORT` | no | Default `4000` |
| `CORS_ORIGIN` | no | Default `http://localhost:3000` |
| `NODE_ENV` | no | `development` / `production` |

### Frontend (`frontend/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | yes | API origin (WebSocket URL is derived as `ws(s)://…/ws`) |

## Scripts

| Location | Command | Description |
|----------|---------|-------------|
| `backend` | `npm run dev` | API + WebSocket |
| `backend` | `npm run db:seed` | Seed sample data |
| `backend` | `npm run db:studio` | Prisma Studio |
| `backend` | `npm run build` / `npm start` | Production build & run |
| `frontend` | `npm run dev` | Next.js dev server |
| `frontend` | `npm run build` | Production build |

## API overview

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/dashboard` | Overview KPIs and activity |
| `GET` | `/api/analytics` | Charts (`?range=7d\|30d\|90d`) |
| `GET/POST` | `/api/bookings` | List / create |
| `PATCH` | `/api/bookings/:id/reassign` | Assign mechanic |
| `PATCH` | `/api/bookings/:id/status` | Update status |
| `GET/POST` | `/api/mechanics` | List / create |
| `GET/POST` | `/api/customers` | List / create |
| `WS` | `/ws` | Realtime events |

Full schema: `/api/docs`.

WebSocket event types: `booking.created`, `booking.updated`, `customer.created`, `mechanic.created`, `ping`.
