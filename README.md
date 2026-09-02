# Instant Mechanic : Live Ops Dashboard

Live vehicle-service operations dashboard for Instant Mechanic: bookings, mechanics, customers, analytics, and **real-time WebSocket updates**.

**Live:** [Dashboard](https://im-live-dashboard.vercel.app/dashboard) · [API](https://api.shivanirai08.me/) · [Docs](https://api.shivanirai08.me/api/docs/) · [GitHub](https://github.com/shivanirai08/dashboard)

## What this project is

Ops teams need one place to see today’s jobs, assign mechanics, and react when something changes without refreshing the page. This app is a small production-style SaaS: Next.js UI → Express API → PostgreSQL, plus a WebSocket channel so Overview / lists / notifications stay live.

## Tech stack

| Layer | Choice |
|--------|--------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts, Lucide |
| Backend | Node.js, Express 5, TypeScript, Prisma 6 |
| Database | PostgreSQL |
| Live updates | Native WebSockets (`ws`) on `/ws` |
| API docs | Swagger UI + OpenAPI (`/api/docs`) |
| Deploy targets | Frontend → Vercel · Backend → AWS (EC2/free tier) · Code → GitHub |

## Architecture

```
Browser (Next.js)
   │  REST  (fetch bookings, KPIs, …)
   │  WS    (live events)
   ▼
Express API  (:4000)
   │  Prisma
   ▼
PostgreSQL
```

**When a booking is created (or reassigned):**

1. Client `POST /api/bookings` (normal HTTP).
2. API writes to Postgres (booking + activity row).
3. API `broadcast()`s a JSON event on `/ws`.
4. Every open dashboard gets the event → notification bell + `ops:refresh` → pages refetch.

HTTP and WebSocket share the **same port**; Node’s `http.Server` wraps Express, then `ws` attaches to path `/ws`.

## Local setup

### Prerequisites

- Node.js 20+
- PostgreSQL running locally (or a remote URL)

### 1. Database

Create a DB, then set `DATABASE_URL` in `backend/.env` (see `backend/.env.example` if present).

```bash
cd backend
cp .env.example .env   # if you have one; otherwise create .env
# DATABASE_URL="postgresql://USER:PASS@localhost:5432/instant_mechanic"
# PORT=4000
# CORS_ORIGIN=http://localhost:3000
```

```bash
npm install
npx prisma db push      # or: npm run db:migrate
npm run db:seed         # 500+ bookings, 50+ customers, 20+ mechanics
npm run dev             # http://localhost:4000  ·  ws://localhost:4000/ws
```

API docs: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

### 2. Frontend

```bash
cd frontend
# .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000

npm install
npm run dev             # http://localhost:3000
```

Open two browser windows → create a booking in one → the other should get a notification and refresh Overview / lists without a full reload.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | Postgres connection string |
| `PORT` | no | Default `4000` |
| `CORS_ORIGIN` | no | Default `http://localhost:3000` |
| `NODE_ENV` | no | `development` / `production` |

### Frontend (`frontend/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | yes | Backend origin, e.g. `http://localhost:4000` (WS URL is derived: `ws://…/ws`) |

## Major API endpoints

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/health` | Liveness |
| `GET` | `/api/dashboard` | Overview KPIs, series, recent bookings, live activity |
| `GET` | `/api/analytics?range=7d\|30d\|90d` | Charts + period deltas |
| `GET` | `/api/bookings` | Search, filter, sort, pagination |
| `GET` | `/api/bookings/:id` | Detail |
| `POST` | `/api/bookings` | Create → emits `booking.created` |
| `PATCH` | `/api/bookings/:id/reassign` | Assign/reassign → emits `booking.updated` |
| `PATCH` | `/api/bookings/:id/status` | Status flow (incl. cancel) → emits `booking.updated` |
| `GET` | `/api/mechanics` | List + status filters |
| `POST` | `/api/mechanics` | Create → emits `mechanic.created` |
| `GET` | `/api/customers` | List + summary |
| `POST` | `/api/customers` | Create → emits `customer.created` |
| `WS` | `/ws` | Realtime JSON events |

Full schema: `/api/docs` and `/api/docs/openapi.json`.

### WebSocket event shape

```json
{
  "type": "booking.created",
  "at": "2026-09-03T01:00:00.000Z",
  "message": "Yash Sharma booked Flat tyre change · IM-48299",
  "data": { "id": "IM-48299", "status": "pending" }
}
```

Types: `booking.created` | `booking.updated` | `customer.created` | `mechanic.created` | `ping`

## Live updates (WebSockets)

The dashboard stays live without a full page reload. The browser opens a persistent WebSocket to `ws://<api-host>/ws` when the app loads. When bookings, customers, or mechanics change on the server, every connected client receives a JSON event and refreshes Overview, lists, live activity, and notifications.

| Trigger | Event type |
|---------|------------|
| New booking | `booking.created` |
| Assign / reassign / status change (incl. cancel) | `booking.updated` |
| New customer | `customer.created` |
| New mechanic | `mechanic.created` |

Relevant code:

- `backend/src/realtime/ws.ts` — WebSocket server and broadcast
- `backend/src/realtime/events.ts` — event payload helpers
- Bookings / customers / mechanics services — emit after writes
- `frontend/src/components/providers/live-provider.tsx` — client connection and notifications
- `useOpsRefresh` — page data refetch on live events

## Product features

- **Overview** — KPI rail, bookings/revenue charts, recent bookings, live activity  
- **Analytics** — range toggle, status donut, service bars, CSV export  
- **Bookings** — search, filters, sort, pagination, detail drawer, assign/reassign  
- **Mechanics** — cards/table, status, jobs, current/last job  
- **Customers** — table, detail drawer, vehicles, lifetime value  
- **UX** — dark mode, loading/empty/error states, command palette, soft shadows  
- **Bonus** — WebSockets, notifications + mark all read, Swagger, CSV export  

## Deployment

### Live links

| | URL |
|--|-----|
| **GitHub** | https://github.com/shivanirai08/dashboard |
| **Frontend** | https://im-live-dashboard.vercel.app/dashboard |
| **Backend** | https://api.shivanirai08.me/ |
| **API docs** | https://api.shivanirai08.me/api/docs/ |

Frontend env on Vercel: `NEXT_PUBLIC_API_URL=https://api.shivanirai08.me`  
Backend env: `CORS_ORIGIN=https://im-live-dashboard.vercel.app` (and WebSocket served at `wss://api.shivanirai08.me/ws`).

### Frontend (Vercel)

1. Import the GitHub repo into Vercel; set root to `frontend` (or monorepo settings).
2. Env: `NEXT_PUBLIC_API_URL=https://api.shivanirai08.me` (no trailing slash).
3. Deploy. Browser uses `wss://` automatically when the API is HTTPS.

### Backend (AWS)

1. EC2 (or similar), install Node 20 + Postgres (RDS or local Docker).
2. Clone repo, `cd backend`, set `.env`, `npm ci`, `npx prisma db push`, `npm run db:seed`, `npm run build`, `npm start` (or pm2).
3. Put Nginx + TLS in front of the API and proxy `/` + `/ws` (domain: `api.shivanirai08.me`).
4. Set `CORS_ORIGIN=https://im-live-dashboard.vercel.app`.

## AI usage

Used Cursor for repetitive work like boilerplate CRUD, OpenAPI field lists, seed data tweaks, and similar grind. Architecture, live WS flow, and UI decisions were owned and verified by me.

## What I’m most proud of

Live WebSocket updates without a full page reload, a clean `controller → service → repository` layout, and a polished ops UI/UX that feels usable day-to-day.

## Project layout

```
dashboard/
  frontend/          Next.js app
  backend/           Express + Prisma + WebSocket
  README.md          this file
```

See also `backend/README.md` and `frontend/README.md` for package-specific commands.
