"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChartNoAxesColumn,
  CircleGauge,
  ClipboardList,
  CornerDownLeft,
  Search,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";

type Item = {
  id: string;
  label: string;
  hint: string;
  group: "Go to" | "Bookings" | "Mechanics";
  icon: typeof Search;
  href: string;
};

const PAGES: Item[] = [
  {
    id: "p-overview",
    label: "Overview",
    hint: "Overview",
    group: "Go to",
    icon: CircleGauge,
    href: "/dashboard",
  },
  {
    id: "p-analytics",
    label: "Analytics",
    hint: "Trends",
    group: "Go to",
    icon: ChartNoAxesColumn,
    href: "/analytics",
  },
  {
    id: "p-bookings",
    label: "Bookings",
    hint: "All jobs",
    group: "Go to",
    icon: ClipboardList,
    href: "/bookings",
  },
  {
    id: "p-pending",
    label: "Pending bookings",
    hint: "Needs dispatch",
    group: "Go to",
    icon: ClipboardList,
    href: "/bookings?status=pending",
  },
  {
    id: "p-mechanics",
    label: "Mechanics",
    hint: "Fleet",
    group: "Go to",
    icon: Wrench,
    href: "/mechanics",
  },
  {
    id: "p-customers",
    label: "Customers",
    hint: "Accounts",
    group: "Go to",
    icon: Users,
    href: "/customers",
  },
];

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [bookingItems, setBookingItems] = useState<Item[]>([]);
  const [mechanicItems, setMechanicItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.getBookings({ limit: 30, sort: "date", dir: "desc" }),
      api.getMechanics(),
    ])
      .then(([bookingsRes, mechanicsRes]) => {
        setBookingItems(
          bookingsRes.data.map((b) => ({
            id: "b-" + b.id,
            label: `${b.id} · ${b.customer}`,
            hint: b.service,
            group: "Bookings" as const,
            icon: ClipboardList,
            href: "/bookings?q=" + encodeURIComponent(b.id),
          })),
        );
        setMechanicItems(
          mechanicsRes.data.map((m) => ({
            id: "m-" + m.id,
            label: m.name,
            hint: m.zone,
            group: "Mechanics" as const,
            icon: User,
            href: "/mechanics?q=" + encodeURIComponent(m.name),
          })),
        );
      })
      .catch(() => {
        setBookingItems([]);
        setMechanicItems([]);
      });
  }, [open]);

  const allItems = useMemo(
    () => [...PAGES, ...bookingItems, ...mechanicItems],
    [bookingItems, mechanicItems],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? allItems.filter(
          (i) => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q),
        )
      : PAGES;
    return pool.slice(0, 12);
  }, [query, allItems]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  if (!open) return null;

  function run(item: Item) {
    router.push(item.href);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    }
    if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      run(results[cursor]);
    }
  }

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-foreground/25" onClick={onClose} />
      <div className="absolute left-1/2 top-24 w-full max-w-xl -ml-[288px] max-[640px]:left-4 max-[640px]:right-4 max-[640px]:ml-0 max-[640px]:w-auto">
        <div
          className="overflow-hidden rounded-xl border border-border bg-surface shadow-panel"
          onKeyDown={onKeyDown}
        >
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search size={16} strokeWidth={1.5} className="shrink-0 text-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to a page, booking or mechanic…"
              className="h-12 flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
            />
            <button
              onClick={onClose}
              className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-subtle hover:text-foreground"
            >
              Esc
            </button>
          </div>

          <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
            {results.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-subtle">
                Nothing matches &ldquo;{query}&rdquo;.
              </p>
            ) : (
              results.map((item, i) => {
                const Icon = item.icon;
                const showGroup = item.group !== lastGroup;
                lastGroup = item.group;
                return (
                  <div key={item.id}>
                    {showGroup ? (
                      <p className="px-4 pb-1 pt-2.5 text-[11px] font-medium text-subtle">
                        {item.group}
                      </p>
                    ) : null}
                    <button
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => run(item)}
                      className={
                        "flex w-full items-center gap-3 px-4 py-2 text-left " +
                        (i === cursor ? "bg-accent-soft" : "")
                      }
                    >
                      <Icon
                        size={15}
                        strokeWidth={1.5}
                        className={i === cursor ? "text-accent" : "text-subtle"}
                      />
                      <span className="flex-1 truncate text-[13px] text-foreground">
                        {item.label}
                      </span>
                      <span className="truncate text-[11px] text-subtle">{item.hint}</span>
                      {i === cursor ? (
                        <CornerDownLeft size={13} strokeWidth={1.5} className="text-accent" />
                      ) : null}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-border bg-surface-2 px-4 py-2 text-[11px] text-subtle">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span className="ml-auto">⌘K anywhere</span>
          </div>
        </div>
      </div>
    </div>
  );
}
