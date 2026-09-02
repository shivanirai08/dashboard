import type { Server as HttpServer } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import type { RealtimeEvent } from "./events.js";

/**
 * Tiny pub/sub over native WebSockets.
 *
 * Flow:
 * 1. Browser opens ws://host/ws (upgrade from HTTP)
 * 2. Server keeps the socket in `clients`
 * 3. When something happens (new booking…), call `broadcast(event)`
 * 4. Every connected browser receives the same JSON and refreshes UI
 */
let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function attachRealtime(server: HttpServer) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, req) => {
    clients.add(socket);
    console.log(`[ws] client connected (${clients.size}) from ${req.socket.remoteAddress ?? "?"}`);

    socket.send(
      JSON.stringify({
        type: "ping",
        at: new Date().toISOString(),
        message: "connected",
      } satisfies RealtimeEvent),
    );

    socket.on("close", () => {
      clients.delete(socket);
      console.log(`[ws] client disconnected (${clients.size})`);
    });

    socket.on("error", () => {
      clients.delete(socket);
    });

    // Optional client→server heartbeats / acks
    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string };
        if (msg.type === "ping") {
          socket.send(
            JSON.stringify({
              type: "ping",
              at: new Date().toISOString(),
              message: "pong",
            } satisfies RealtimeEvent),
          );
        }
      } catch {
        /* ignore bad frames */
      }
    });
  });

  console.log("[ws] realtime listening on /ws");
}

export function broadcast(event: RealtimeEvent) {
  if (!wss) return;
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}
