import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { attachRealtime } from "./realtime/ws.js";

const app = createApp();

async function start() {
  await prisma.$connect();

  // Express alone can't do WebSockets — we wrap it in Node's HTTP server,
  // then attach `ws` on the same port (HTTP + WS share :4000).
  const server = http.createServer(app);
  attachRealtime(server);

  server.listen(env.port, () => {
    console.log(`Instant Mechanic API running on http://localhost:${env.port}`);
    console.log(`WebSocket endpoint ws://localhost:${env.port}/ws`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
