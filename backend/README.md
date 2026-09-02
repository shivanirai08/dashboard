# Instant Mechanic API

Express + Prisma + PostgreSQL backend for the Live Ops Dashboard, with **WebSocket** realtime on `/ws`.

## Quick start

```bash
cp .env.example .env   # set DATABASE_URL, PORT, CORS_ORIGIN
npm install
npx prisma db push
npm run db:seed
npm run dev
```

- HTTP: `http://localhost:4000`
- Docs: `http://localhost:4000/api/docs`
- WebSocket: `ws://localhost:4000/ws`

## Scripts

| Script | What it does |
|--------|----------------|
| `npm run dev` | `tsx watch` API + WS |
| `npm run build` | `prisma generate` + `tsc` |
| `npm start` | Run compiled `dist/` |
| `npm run db:seed` | Seed sample ops data |
| `npm run typecheck` | Strict TS check |

## Realtime

After `POST /api/bookings`, `PATCH …/reassign`, `POST /api/customers`, or `POST /api/mechanics`, the API broadcasts:

```ts
{ type, at, message, data? }
```

Implementation: `src/realtime/ws.ts` + `src/realtime/events.ts`. Server entry uses `http.createServer(app)` so HTTP and WS share one port (`src/index.ts`).

## Modules

`controller → service → repository → routes` under `src/modules/` for dashboard, analytics, bookings, mechanics, customers.
