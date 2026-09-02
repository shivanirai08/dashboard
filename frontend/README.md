# Instant Mechanic — Frontend

Next.js ops dashboard UI. Talks to the Express API over REST and stays live via **WebSocket**.

## Quick start

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Live updates

`LiveProvider` (`src/components/providers/live-provider.tsx`) opens `ws://…/ws` (derived from `NEXT_PUBLIC_API_URL`).

On each event (except `ping`):

1. Prepends a notification (unread → red bell dot)
2. Dispatches `ops:refresh` so Overview / Bookings / etc. refetch via `useOpsRefresh`

## Main routes

| Path | Page |
|------|------|
| `/dashboard` | Overview |
| `/analytics` | Charts |
| `/bookings` | Table + drawer |
| `/mechanics` | Fleet |
| `/customers` | Accounts |

## Deploy (Vercel)

Set `NEXT_PUBLIC_API_URL` to your public API origin. Use HTTPS API so the browser uses `wss://`.
