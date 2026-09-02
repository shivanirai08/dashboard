"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Inbox,
  ListFilter,
  MapPin,
  Phone,
  Plus,
  Search,
  X,
} from "lucide-react";
import AppLayout from "@/components/layout/app-layout";
import {
  EmptyState,
  ErrorState,
  GhostButton,
  Initials,
  Panel,
  PrimaryButton,
  Skeleton,
  StatusPill,
} from "@/components/ui";
import { api, type StatusCounts } from "@/lib/api";
import { money, statusLabel } from "@/lib/format";
import { useDebounce } from "@/hooks/use-debounce";
import type { Booking, BookingStatus } from "@/types";

type SortKey = "id" | "customer" | "service" | "mechanic" | "amount" | "date";
const PAGE_SIZE = 10;

const STATUS_TABS: (BookingStatus | "all")[] = [
  "all",
  "pending",
  "assigned",
  "on_the_way",
  "completed",
  "cancelled",
];

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
  className = "",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
  className?: string;
}) {
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={"px-4 py-2 " + className}>
      <button
        onClick={onClick}
        className={
          "inline-flex items-center gap-1 text-[11px] font-medium " +
          (active ? "text-foreground" : "text-subtle hover:text-muted") +
          (align === "right" ? " flex-row-reverse" : "")
        }
      >
        {label}
        <Icon size={12} strokeWidth={2} className={active ? "text-accent" : ""} />
      </button>
    </th>
  );
}

function OptionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] " +
        (selected ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-3")
      }
    >
      <Check size={13} strokeWidth={2} className={selected ? "" : "opacity-0"} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function BookingDrawer({
  booking,
  onClose,
  onPrev,
  onNext,
  position,
}: {
  booking: Booking;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  position: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "j") onNext();
      if (e.key === "ArrowUp" || e.key === "k") onPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/25" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-panel">
        <header className="border-b border-border px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={onPrev}
                className="rounded-md p-1 text-subtle hover:bg-surface-3 hover:text-foreground"
                aria-label="Previous booking"
              >
                <ChevronLeft size={15} strokeWidth={1.5} />
              </button>
              <button
                onClick={onNext}
                className="rounded-md p-1 text-subtle hover:bg-surface-3 hover:text-foreground"
                aria-label="Next booking"
              >
                <ChevronRight size={15} strokeWidth={1.5} />
              </button>
              <span className="ml-1.5 text-[11px] tabular-nums text-subtle">{position}</span>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-subtle hover:bg-surface-3 hover:text-foreground"
            >
              <span className="rounded border border-border px-1 py-0.5 font-medium">Esc</span>
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{booking.id}</h2>
            <StatusPill status={booking.status} />
          </div>
          <p className="mt-1 text-xs text-subtle">
            {booking.date} · {booking.time} · {booking.location}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Initials name={booking.customer} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">{booking.customer}</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted">
                <Phone size={12} strokeWidth={1.5} />
                {booking.phone}
              </p>
            </div>
            <GhostButton>Call</GhostButton>
          </div>

          <dl className="divide-y divide-border">
            {[
              ["Service", booking.service],
              ["Vehicle", `${booking.vehicle} · ${booking.plate}`],
              ["Mechanic", booking.mechanic ?? "Unassigned"],
              ["Pickup zone", booking.location],
              ["Amount", money(booking.amount)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-6 px-5 py-3">
                <dt className="text-xs text-subtle">{k}</dt>
                <dd className="text-right text-[13px] font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="px-5 py-4">
            <p className="text-xs font-medium text-subtle">Timeline</p>
            <ul className="mt-3">
              {[
                ["Request received", booking.time],
                ["Mechanic assigned", "+4 min"],
                ["En route", "+9 min"],
                ["On site", "+26 min"],
              ].map(([k, v], i, arr) => (
                <li key={k} className="relative flex gap-3 pb-3.5 last:pb-0">
                  {i < arr.length - 1 ? (
                    <span className="absolute left-1 top-3 h-full w-px bg-border" />
                  ) : null}
                  <span className="relative mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <div className="flex flex-1 items-baseline justify-between">
                    <span className="text-[13px] text-foreground">{k}</span>
                    <span className="text-[11px] tabular-nums text-subtle">{v}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-3">
          <PrimaryButton>Reassign mechanic</PrimaryButton>
          <GhostButton>Contact customer</GhostButton>
        </footer>
      </aside>
    </div>
  );
}

function BookingsContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debouncedQuery = useDebounce(query);
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "all");
  const [service, setService] = useState<string>("all");
  const [mechanic, setMechanic] = useState<string>("all");
  const [range, setRange] = useState<string>("30d");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [rows, setRows] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState<StatusCounts>({ all: 0 });
  const [services, setServices] = useState<string[]>([]);
  const [mechanicNames, setMechanicNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const q = searchParams.get("q");
    const st = searchParams.get("status");
    if (q !== null) setQuery(q);
    if (st !== null) setStatus(st);
    else setStatus("all");
  }, [searchParams]);

  useEffect(() => {
    api.getBookingStatusCounts().then(setCounts).catch(() => {});
    api
      .getBookingFilters()
      .then((filters) => {
        setServices(filters.services);
        setMechanicNames(filters.mechanics);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api
      .getBookings({
        q: debouncedQuery || undefined,
        status,
        service,
        mechanic,
        sort: sort.key,
        dir: sort.dir,
        page,
        limit: PAGE_SIZE,
      })
      .then((result) => {
        setRows(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [debouncedQuery, status, service, mechanic, sort, page]);

  const reload = () => {
    setError(false);
    setLoading(true);
    api
      .getBookings({
        q: debouncedQuery || undefined,
        status,
        service,
        mechanic,
        sort: sort.key,
        dir: sort.dir,
        page,
        limit: PAGE_SIZE,
      })
      .then((result) => {
        setRows(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  const pageRows = rows;
  const pages = totalPages;
  const extraFilters = (service !== "all" ? 1 : 0) + (mechanic !== "all" ? 1 : 0);

  const selectedIndex = rows.findIndex((b) => b.id === selectedId);
  const selected = selectedIndex >= 0 ? rows[selectedIndex] : null;

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function step(delta: number) {
    if (selectedIndex < 0) return;
    const next = Math.min(rows.length - 1, Math.max(0, selectedIndex + delta));
    setSelectedId(rows[next].id);
    setPage(Math.floor(next / PAGE_SIZE));
  }

  function toggleSort(key: SortKey) {
    setPage(0);
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  function pickStatus(s: string) {
    setStatus(s);
    setPage(0);
    updateParams((next) => {
      if (s === "all") next.delete("status");
      else next.set("status", s);
    });
  }

  function resetAll() {
    setStatus("all");
    setService("all");
    setMechanic("all");
    setQuery("");
    setPage(0);
    router.replace(pathname);
  }

  const empty = !loading && !error && total === 0 && !debouncedQuery && status === "all";

  return (
    <AppLayout
      title="Bookings"
      subtitle={`${total.toLocaleString("en-IN")} jobs · all zones`}
      actions={
        <>
          <div className="flex items-center gap-0.5 overflow-x-auto rounded-lg bg-surface-3 p-0.5">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => pickStatus(s)}
                className={
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium " +
                  (status === s
                    ? "bg-surface text-foreground shadow-raised"
                    : "text-muted hover:text-foreground")
                }
              >
                {s === "all" ? "All" : statusLabel[s as BookingStatus]}
                <span className={"tabular-nums " + (status === s ? "text-accent" : "text-subtle")}>
                  {counts[s] ?? 0}
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
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search ID, customer, plate…"
              className="h-8 w-56 rounded-lg border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-subtle focus:border-accent-ring focus:outline-none focus:ring-2 focus:ring-accent-ring/40"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium " +
                (extraFilters > 0
                  ? "border-accent-ring bg-accent-soft text-accent"
                  : "border-border bg-surface text-muted hover:text-foreground")
              }
            >
              <ListFilter size={13} strokeWidth={1.5} />
              Filters
              {extraFilters > 0 ? (
                <span className="rounded bg-accent px-1 text-[10px] font-semibold text-white">
                  {extraFilters}
                </span>
              ) : null}
              <ChevronDown size={12} strokeWidth={2} />
            </button>

            {filtersOpen ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFiltersOpen(false)} />
                <div className="absolute left-0 top-9 z-50 w-72 rounded-xl border border-border bg-surface p-3 shadow-panel">
                  <p className="px-2 pb-1 text-[11px] font-medium text-subtle">Date range</p>
                  <div className="flex gap-1 px-1 pb-3">
                    {RANGES.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setRange(r.value)}
                        className={
                          "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium " +
                          (range === r.value
                            ? "bg-foreground text-white"
                            : "bg-surface-3 text-muted hover:text-foreground")
                        }
                      >
                        {r.label.replace("Last ", "")}
                      </button>
                    ))}
                  </div>

                  <p className="px-2 pb-1 text-[11px] font-medium text-subtle">Service</p>
                  <div className="max-h-40 overflow-y-auto pb-2">
                    <OptionRow
                      label="All services"
                      selected={service === "all"}
                      onClick={() => {
                        setService("all");
                        setPage(0);
                      }}
                    />
                    {services.map((s) => (
                      <OptionRow
                        key={s}
                        label={s}
                        selected={service === s}
                        onClick={() => {
                          setService(s);
                          setPage(0);
                        }}
                      />
                    ))}
                  </div>

                  <p className="border-t border-border px-2 pb-1 pt-2 text-[11px] font-medium text-subtle">
                    Mechanic
                  </p>
                  <div className="max-h-40 overflow-y-auto">
                    <OptionRow
                      label="All mechanics"
                      selected={mechanic === "all"}
                      onClick={() => {
                        setMechanic("all");
                        setPage(0);
                      }}
                    />
                    {mechanicNames.map((m) => (
                      <OptionRow
                        key={m}
                        label={m}
                        selected={mechanic === m}
                        onClick={() => {
                          setMechanic(m);
                          setPage(0);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {extraFilters > 0 || status !== "all" || query ? (
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft"
            >
              <X size={12} strokeWidth={2} />
              Reset
            </button>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <GhostButton>
              <Download size={13} strokeWidth={1.5} />
              Export
            </GhostButton>
            <PrimaryButton>
              <Plus size={14} strokeWidth={2} />
              New booking
            </PrimaryButton>
          </div>
        </>
      }
    >
      <div className="mx-auto max-w-[1320px]">
        <Panel className="overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              <div className="flex gap-4 bg-surface-2 px-4 py-2.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-2.5 flex-1" />
                ))}
              </div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-2.5 flex-1" />
                  <Skeleton className="h-2.5 w-28" />
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-2.5 w-14" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : empty || rows.length === 0 ? (
            <EmptyState
              icon={<Inbox size={18} strokeWidth={1.5} />}
              title={empty ? "No bookings yet" : "No bookings match these filters"}
              body={
                empty
                  ? "When a customer requests roadside help, the job appears here within seconds."
                  : "Try a wider date range, or clear the status and mechanic filters."
              }
              action={
                empty ? (
                  <PrimaryButton>
                    <Plus size={14} strokeWidth={2} />
                    Create booking
                  </PrimaryButton>
                ) : (
                  <GhostButton onClick={resetAll}>Reset filters</GhostButton>
                )
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px]">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-left">
                      <SortHeader
                        label="Booking"
                        active={sort.key === "id"}
                        dir={sort.dir}
                        onClick={() => toggleSort("id")}
                      />
                      <SortHeader
                        label="Customer"
                        active={sort.key === "customer"}
                        dir={sort.dir}
                        onClick={() => toggleSort("customer")}
                      />
                      <th className="px-4 py-2 text-[11px] font-medium text-subtle">Vehicle</th>
                      <SortHeader
                        label="Service"
                        active={sort.key === "service"}
                        dir={sort.dir}
                        onClick={() => toggleSort("service")}
                      />
                      <SortHeader
                        label="Mechanic"
                        active={sort.key === "mechanic"}
                        dir={sort.dir}
                        onClick={() => toggleSort("mechanic")}
                      />
                      <th className="px-4 py-2 text-[11px] font-medium text-subtle">Status</th>
                      <SortHeader
                        label="Amount"
                        active={sort.key === "amount"}
                        dir={sort.dir}
                        onClick={() => toggleSort("amount")}
                        align="right"
                        className="text-right"
                      />
                      <SortHeader
                        label="Date / time"
                        active={sort.key === "date"}
                        dir={sort.dir}
                        onClick={() => toggleSort("date")}
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageRows.map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedId(b.id)}
                        className={
                          "group cursor-pointer " +
                          (selectedId === b.id ? "bg-accent-soft" : "hover:bg-surface-2")
                        }
                      >
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-medium tabular-nums text-muted group-hover:text-accent">
                            {b.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Initials name={b.customer} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-foreground">
                                {b.customer}
                              </p>
                              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-subtle">
                                <MapPin size={10} strokeWidth={1.5} />
                                {b.location}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                            <Car size={13} strokeWidth={1.5} className="text-subtle" />
                            {b.vehicle}
                          </p>
                          <p className="mt-0.5 pl-5 text-[11px] tabular-nums text-subtle">
                            {b.plate}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-muted">{b.service}</td>
                        <td className="px-4 py-3 text-[13px] text-muted">
                          {b.mechanic ?? <span className="text-subtle">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={b.status} />
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] font-medium tabular-nums text-foreground">
                          {money(b.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[13px] tabular-nums text-muted">{b.date}</p>
                          <p className="mt-0.5 text-[11px] tabular-nums text-subtle">{b.time}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-2 px-4 py-2.5">
                <p className="text-xs tabular-nums text-muted">
                  <span className="font-medium text-foreground">
                    {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)}
                  </span>{" "}
                  of <span className="font-medium text-foreground">{total}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={13} strokeWidth={2} />
                    Prev
                  </button>
                  {Array.from({ length: Math.min(pages, 5) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={
                        "h-7 w-7 rounded-md text-xs font-medium tabular-nums " +
                        (page === i
                          ? "bg-foreground text-white"
                          : "text-muted hover:bg-surface-3 hover:text-foreground")
                      }
                    >
                      {i + 1}
                    </button>
                  ))}
                  {pages > 5 ? <span className="px-1 text-xs text-subtle">…</span> : null}
                  <button
                    disabled={page >= pages - 1}
                    onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
                  >
                    Next
                    <ChevronRight size={13} strokeWidth={2} />
                  </button>
                </div>
              </footer>
            </>
          )}
        </Panel>
      </div>

      {selected ? (
        <BookingDrawer
          booking={selected}
          onClose={() => setSelectedId(null)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          position={`${selectedIndex + 1} of ${total}`}
        />
      ) : null}
    </AppLayout>
  );
}

function BookingsLoadingFallback() {
  return (
    <AppLayout title="Bookings" subtitle="Loading…">
      <div className="mx-auto max-w-[1320px]">
        <Panel className="overflow-hidden p-8">
          <Skeleton className="h-64 w-full" />
        </Panel>
      </div>
    </AppLayout>
  );
}

export default function BookingsContent() {
  return (
    <Suspense fallback={<BookingsLoadingFallback />}>
      <BookingsContentInner />
    </Suspense>
  );
}
