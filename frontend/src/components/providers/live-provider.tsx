"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type LiveEventType =
  | "booking.created"
  | "booking.updated"
  | "customer.created"
  | "mechanic.created"
  | "ping";

export type LiveEvent = {
  type: LiveEventType;
  at: string;
  message: string;
  data?: Record<string, unknown>;
};

export type AppNotification = {
  id: string;
  text: string;
  at: string;
};

const SEED_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", text: "Rahul Sharma completed IM-48205", at: new Date().toISOString() },
  { id: "n2", text: "Battery jump-start booked in Andheri", at: new Date().toISOString() },
  { id: "n3", text: "New customer Aarav Mehta added", at: new Date().toISOString() },
];

const READ_KEY = "im-notif-read";

type LiveContextValue = {
  connected: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markOneRead: (id: string) => void;
  isUnread: (id: string) => boolean;
};

const LiveContext = createContext<LiveContextValue | null>(null);

function apiToWsUrl(apiUrl: string) {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(SEED_NOTIFICATIONS);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(READ_KEY);
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      if (Array.isArray(ids)) setReadIds(new Set(ids));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const persistRead = useCallback((next: Set<string>) => {
    setReadIds(next);
    window.localStorage.setItem(READ_KEY, JSON.stringify([...next]));
  }, []);

  const markAllRead = useCallback(() => {
    persistRead(new Set(notifications.map((n) => n.id)));
  }, [notifications, persistRead]);

  const markOneRead = useCallback(
    (id: string) => {
      if (readIds.has(id)) return;
      const next = new Set(readIds);
      next.add(id);
      persistRead(next);
    },
    [persistRead, readIds],
  );

  const isUnread = useCallback((id: string) => !readIds.has(id), [readIds]);

  const handleEvent = useCallback((event: LiveEvent) => {
    if (event.type === "ping") return;

    setNotifications((prev) => {
      const next: AppNotification = {
        id: `live-${event.type}-${event.at}-${Math.random().toString(36).slice(2, 7)}`,
        text: event.message,
        at: event.at,
      };
      return [next, ...prev].slice(0, 30);
    });

    // Same event pages already listen to after modal creates
    window.dispatchEvent(new CustomEvent("ops:refresh"));
  }, []);

  useEffect(() => {
    // Connect as soon as the app shell mounts (every logged-in dashboard page).
    // Stays open until tab close / network drop — then auto-reconnects every 2.5s.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const wsUrl = apiToWsUrl(apiUrl);
    let closed = false;

    function connect() {
      if (closed) return;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => setConnected(true);

      socket.onmessage = (frame) => {
        try {
          const event = JSON.parse(String(frame.data)) as LiveEvent;
          handleEvent(event);
        } catch {
          /* ignore bad frames */
        }
      };

      socket.onclose = () => {
        setConnected(false);
        socketRef.current = null;
        if (!closed) {
          retryRef.current = setTimeout(connect, 2500);
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      closed = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      socketRef.current?.close();
    };
  }, [handleEvent]);

  const unreadCount = hydrated
    ? notifications.filter((n) => !readIds.has(n.id)).length
    : 0;

  const value = useMemo(
    () => ({
      connected,
      notifications,
      unreadCount,
      markAllRead,
      markOneRead,
      isUnread,
    }),
    [connected, notifications, unreadCount, markAllRead, markOneRead, isUnread],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used within LiveProvider");
  return ctx;
}
