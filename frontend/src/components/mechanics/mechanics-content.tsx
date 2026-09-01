"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  List,
  MapPin,
  Phone,
  Search,
  Star,
  UserRoundX,
  Wrench,
  X,
} from "lucide-react";
import AppLayout from "@/components/layout/app-layout";
import {
  EmptyState,
  ErrorState,
  GhostButton,
  Initials,
  MechanicPill,
  Panel,
  PrimaryButton,
  Skeleton,
  useDataMode,
} from "@/components/ui";
import { mechanics as ALL, mechanicStatusLabel } from "@/lib/mock-data";
import type { Mechanic, MechanicStatus } from "@/types";

const FILTERS: { key: MechanicStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "on_job", label: "On job" },
  { key: "offline", label: "Offline" },
];

const accentRing: Record<MechanicStatus, string> = {
  available: "ring-done",
  on_job: "ring-accent",
  offline: "ring-border-strong",
};

function MechanicCard({ m, onOpen }: { m: Mechanic; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col items-start rounded-xl border border-border bg-surface p-4 text-left hover:border-border-strong hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={
              "rounded-full ring-2 ring-offset-2 ring-offset-surface " + accentRing[m.status]
            }
          >
            <Initials name={m.name} size="lg" tone={m.status === "on_job" ? "accent" : "neutral"} />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">{m.name}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-subtle">
              <MapPin size={10} strokeWidth={1.5} />
              {m.zone} · {m.id}
            </p>
          </div>
        </div>
        <MechanicPill status={m.status} />
      </div>

      <div className="mt-4 flex w-full items-center gap-5">
        <div>
          <p className="text-[11px] text-subtle">Jobs done</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums tracking-tight text-foreground">
            {m.jobsCompleted}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-subtle">Rating</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-base font-semibold tabular-nums tracking-tight text-foreground">
            <Star size={13} strokeWidth={2} className="text-accent" />
            {m.rating}
          </p>
        </div>
      </div>

      <div className="mt-4 w-full border-t border-border pt-3">
        <p className="text-[11px] text-subtle">{m.currentBooking ? "Current job" : "Last job"}</p>
        <p className="mt-1 truncate text-[13px] text-foreground">
          {(m.currentBooking ?? m.lastBooking).service}
        </p>
        <p className="mt-0.5 truncate text-[11px] tabular-nums text-subtle">
          {(m.currentBooking ?? m.lastBooking).id} · {(m.currentBooking ?? m.lastBooking).customer}
        </p>
      </div>
    </button>
  );
}

function DetailPanel({ m, onClose }: { m: Mechanic; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/25" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-panel">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3.5">
            <span
              className={
                "rounded-full ring-2 ring-offset-2 ring-offset-surface " + accentRing[m.status]
              }
            >
              <Initials name={m.name} size="lg" tone={m.status === "on_job" ? "accent" : "neutral"} />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">{m.name}</h2>
              <div className="mt-1.5 flex items-center gap-2">
                <MechanicPill status={m.status} />
                <span className="text-[11px] tabular-nums text-subtle">{m.id}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
            {[
              ["Jobs done", String(m.jobsCompleted)],
              ["Rating", m.rating.toFixed(1)],
              ["Since", m.since],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface px-4 py-3.5">
                <p className="text-[11px] text-subtle">{k}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                  {v}
                </p>
              </div>
            ))}
          </div>

          {m.currentBooking ? (
            <div className="border-b border-border bg-accent-soft px-5 py-4">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                On job now
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{m.currentBooking.service}</p>
              <p className="mt-0.5 text-xs tabular-nums text-muted">
                {m.currentBooking.id} · {m.currentBooking.customer}
              </p>
            </div>
          ) : null}

          <dl className="divide-y divide-border">
            {[
              ["Status", mechanicStatusLabel[m.status]],
              ["Zone", m.zone],
              ["Phone", m.phone],
              ["Last job", `${m.lastBooking.service} · ${m.lastBooking.id}`],
              ["Specialties", m.specialties.join(", ")],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-6 px-5 py-3">
                <dt className="shrink-0 text-xs text-subtle">{k}</dt>
                <dd className="text-right text-[13px] font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-3">
          <PrimaryButton>Assign job</PrimaryButton>
          <GhostButton>
            <Phone size={13} strokeWidth={1.5} />
            Call
          </GhostButton>
        </footer>
      </aside>
    </div>
  );
}

function MechanicsContentInner() {
  const [mode, setMode] = useDataMode();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<MechanicStatus | "all">("all");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Mechanic | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
  }, [searchParams]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL.filter((m) => {
      if (filter !== "all" && m.status !== filter) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.zone.toLowerCase().includes(q);
    });
  }, [filter, query]);

  const counts = useMemo(
    () => ({
      available: ALL.filter((m) => m.status === "available").length,
      on_job: ALL.filter((m) => m.status === "on_job").length,
      offline: ALL.filter((m) => m.status === "offline").length,
    }),
    [],
  );

  const loading = mode === "loading";
  const error = mode === "error";
  const empty = mode === "empty";

  return (
    <AppLayout
      title="Mechanics"
      subtitle={`${counts.available} available · ${counts.on_job} on job · ${counts.offline} offline`}
      actions={
        <>
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-surface-3 p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium " +
                  (filter === f.key
                    ? "bg-surface text-foreground shadow-raised"
                    : "text-muted hover:text-foreground")
                }
              >
                {f.label}
                <span
                  className={"tabular-nums " + (filter === f.key ? "text-accent" : "text-subtle")}
                >
                  {f.key === "all" ? ALL.length : ALL.filter((m) => m.status === f.key).length}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-2.5 top-1/2 -mt-2 text-subtle"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or zone…"
              className="h-8 w-52 rounded-lg border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-subtle focus:border-accent-ring focus:outline-none focus:ring-2 focus:ring-accent-ring/40"
            />
          </div>

          <div className="ml-auto inline-flex items-center gap-0.5 rounded-lg bg-surface-3 p-0.5">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={
                "rounded-md p-1.5 " +
                (view === "grid"
                  ? "bg-surface text-foreground shadow-raised"
                  : "text-subtle hover:text-foreground")
              }
            >
              <LayoutGrid size={14} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={
                "rounded-md p-1.5 " +
                (view === "list"
                  ? "bg-surface text-foreground shadow-raised"
                  : "text-subtle hover:text-foreground")
              }
            >
              <List size={14} strokeWidth={1.5} />
            </button>
          </div>
        </>
      }
    >
      <div className="mx-auto max-w-[1320px]">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="mt-2 h-2.5 w-24" />
                  </div>
                </div>
                <Skeleton className="mt-5 h-16 w-full rounded-lg" />
                <Skeleton className="mt-4 h-2.5 w-40" />
              </div>
            ))}
          </div>
        ) : error ? (
          <Panel>
            <ErrorState onRetry={() => setMode("ready")} />
          </Panel>
        ) : empty || rows.length === 0 ? (
          <Panel>
            <EmptyState
              icon={
                empty ? (
                  <Wrench size={18} strokeWidth={1.5} />
                ) : (
                  <UserRoundX size={18} strokeWidth={1.5} />
                )
              }
              title={empty ? "No mechanics onboarded" : "No mechanics match this view"}
              body={
                empty
                  ? "Invite your first mechanic to start dispatching roadside jobs."
                  : "Try a different status filter or clear the search."
              }
              action={
                empty ? (
                  <PrimaryButton>Invite mechanic</PrimaryButton>
                ) : (
                  <GhostButton
                    onClick={() => {
                      setFilter("all");
                      setQuery("");
                    }}
                  >
                    Reset filters
                  </GhostButton>
                )
              }
            />
          </Panel>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((m) => (
              <MechanicCard key={m.id} m={m} onOpen={() => setSelected(m)} />
            ))}
          </div>
        ) : (
          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-left">
                    {["Mechanic", "Status", "Zone", "Jobs done", "Rating", "Current / last job"].map(
                      (h) => (
                        <th key={h} className="px-4 py-2 text-[11px] font-medium text-subtle">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className="group cursor-pointer hover:bg-surface-2"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Initials
                            name={m.name}
                            size="sm"
                            tone={m.status === "on_job" ? "accent" : "neutral"}
                          />
                          <div>
                            <p className="text-[13px] font-medium text-foreground">{m.name}</p>
                            <p className="text-[11px] tabular-nums text-subtle">{m.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <MechanicPill status={m.status} />
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-muted">{m.zone}</td>
                      <td className="px-4 py-3.5 text-[13px] font-medium tabular-nums text-foreground">
                        {m.jobsCompleted}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] tabular-nums text-muted">{m.rating}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] text-muted">
                          {(m.currentBooking ?? m.lastBooking).service}
                        </p>
                        <p className="text-[11px] tabular-nums text-subtle">
                          {(m.currentBooking ?? m.lastBooking).id}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      {selected ? <DetailPanel m={selected} onClose={() => setSelected(null)} /> : null}
    </AppLayout>
  );
}

function MechanicsLoadingFallback() {
  return (
    <AppLayout title="Mechanics" subtitle="Loading…">
      <div className="mx-auto max-w-[1320px]">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </AppLayout>
  );
}

export default function MechanicsContent() {
  return (
    <Suspense fallback={<MechanicsLoadingFallback />}>
      <MechanicsContentInner />
    </Suspense>
  );
}
