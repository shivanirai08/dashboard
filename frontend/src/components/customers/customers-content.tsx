"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Car,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Mail,
  Phone,
  Plus,
  Search,
  UserRoundX,
  Users,
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
  Trend,
} from "@/components/ui";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useDebounce } from "@/hooks/use-debounce";
import type { Customer } from "@/types";

type SortKey = "name" | "bookingsCount" | "totalSpent" | "joinedAt";
const PAGE_SIZE = 10;

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

function CustomerDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
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
        <header className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Initials name={customer.name} size="lg" tone="accent" />
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {customer.name}
                </h2>
                <p className="mt-0.5 text-[11px] tabular-nums text-subtle">{customer.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-foreground"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
            {[
              ["Bookings", String(customer.bookingsCount)],
              ["Lifetime", money(customer.totalSpent)],
              ["Vehicles", String(customer.vehicles.length)],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface px-4 py-3.5">
                <p className="text-[11px] text-subtle">{k}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                  {v}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Phone size={12} strokeWidth={1.5} />
                {customer.phone}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
                <Mail size={12} strokeWidth={1.5} />
                {customer.email}
              </p>
            </div>
            <GhostButton>Contact</GhostButton>
          </div>

          <dl className="divide-y divide-border">
            {[
              ["Zone", customer.zone],
              ["Member since", customer.joinedAt],
              [
                "Last service",
                `${customer.lastBooking.service} · ${customer.lastBooking.id}`,
              ],
              ["Last booking date", customer.lastBooking.date],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-6 px-5 py-3">
                <dt className="shrink-0 text-xs text-subtle">{k}</dt>
                <dd className="text-right text-[13px] font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-border px-5 py-4">
            <p className="text-xs font-medium text-subtle">Saved vehicles</p>
            <ul className="mt-3 space-y-2">
              {customer.vehicles.map((v) => (
                <li
                  key={v}
                  className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-muted"
                >
                  <Car size={13} strokeWidth={1.5} className="text-subtle" />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-3">
          <PrimaryButton>
            <Plus size={14} strokeWidth={2} />
            New booking
          </PrimaryButton>
          <Link
            href={`/bookings?q=${encodeURIComponent(customer.name)}`}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground"
          >
            View bookings
          </Link>
        </footer>
      </aside>
    </div>
  );
}

export default function CustomersContent() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "totalSpent",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null);

  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalBookings: 0,
    avgLifetimeValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .getCustomers({
        q: debouncedQuery || undefined,
        sort: sort.key,
        dir: sort.dir,
        page,
        limit: PAGE_SIZE,
      })
      .then((result) => {
        setRows(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
        setSummary(result.summary);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [debouncedQuery, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const pageRows = rows;
  const pages = totalPages;

  function toggleSort(key: SortKey) {
    setPage(0);
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  const empty = !loading && !error && summary.totalCustomers === 0;

  return (
    <AppLayout
      title="Customers"
      subtitle={`${summary.totalCustomers.toLocaleString("en-IN")} accounts · vehicles and service history`}
      actions={
        <>
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
              placeholder="Search name, phone, email…"
              className="h-8 w-56 rounded-lg border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-subtle focus:border-accent-ring focus:outline-none focus:ring-2 focus:ring-accent-ring/40"
            />
          </div>

          {query ? (
            <button
              onClick={() => {
                setQuery("");
                setPage(0);
              }}
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
              Add customer
            </PrimaryButton>
          </div>
        </>
      }
    >
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {[
            { label: "Total customers", value: summary.totalCustomers.toLocaleString("en-IN"), delta: 9.6 },
            {
              label: "Total bookings",
              value: summary.totalBookings.toLocaleString("en-IN"),
              delta: 8.4,
            },
            {
              label: "Avg lifetime value",
              value: money(summary.avgLifetimeValue),
              delta: 5.2,
            },
          ].map((s) => (
            <div key={s.label} className="bg-surface px-5 py-4">
              <p className="text-[11px] font-medium text-muted">{s.label}</p>
              {loading ? (
                <Skeleton className="mt-3 h-7 w-28" />
              ) : (
                <div className="mt-2 flex items-baseline gap-2.5">
                  <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                    {s.value}
                  </p>
                  <Trend delta={s.delta} />
                </div>
              )}
            </div>
          ))}
        </div>

        <Panel className="overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="my-2 h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <ErrorState onRetry={load} />
          ) : empty || rows.length === 0 ? (
            <EmptyState
              icon={
                empty ? (
                  <Users size={18} strokeWidth={1.5} />
                ) : (
                  <UserRoundX size={18} strokeWidth={1.5} />
                )
              }
              title={empty ? "No customers yet" : "No customers match your search"}
              body={
                empty
                  ? "Customer profiles, saved vehicles and lifetime value appear here as bookings come in."
                  : "Try a different name, phone number or email."
              }
              action={
                empty ? (
                  <PrimaryButton>
                    <Plus size={14} strokeWidth={2} />
                    Add customer
                  </PrimaryButton>
                ) : (
                  <GhostButton
                    onClick={() => {
                      setQuery("");
                      setPage(0);
                    }}
                  >
                    Clear search
                  </GhostButton>
                )
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-left">
                      <SortHeader
                        label="Customer"
                        active={sort.key === "name"}
                        dir={sort.dir}
                        onClick={() => toggleSort("name")}
                      />
                      <th className="px-4 py-2 text-[11px] font-medium text-subtle">Contact</th>
                      <th className="px-4 py-2 text-[11px] font-medium text-subtle">Zone</th>
                      <SortHeader
                        label="Bookings"
                        active={sort.key === "bookingsCount"}
                        dir={sort.dir}
                        onClick={() => toggleSort("bookingsCount")}
                        align="right"
                        className="text-right"
                      />
                      <SortHeader
                        label="Lifetime value"
                        active={sort.key === "totalSpent"}
                        dir={sort.dir}
                        onClick={() => toggleSort("totalSpent")}
                        align="right"
                        className="text-right"
                      />
                      <th className="px-4 py-2 text-[11px] font-medium text-subtle">Last service</th>
                      <SortHeader
                        label="Member since"
                        active={sort.key === "joinedAt"}
                        dir={sort.dir}
                        onClick={() => toggleSort("joinedAt")}
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageRows.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className={
                          "group cursor-pointer " +
                          (selected?.id === c.id ? "bg-accent-soft" : "hover:bg-surface-2")
                        }
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Initials name={c.name} size="sm" tone="accent" />
                            <div>
                              <p className="text-[13px] font-medium text-foreground group-hover:text-accent">
                                {c.name}
                              </p>
                              <p className="text-[11px] tabular-nums text-subtle">{c.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[13px] text-muted">{c.phone}</p>
                          <p className="mt-0.5 truncate text-[11px] text-subtle">{c.email}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-muted">{c.zone}</td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-medium tabular-nums text-foreground">
                          {c.bookingsCount}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[13px] font-medium tabular-nums text-foreground">
                          {money(c.totalSpent)}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[13px] text-muted">{c.lastBooking.service}</p>
                          <p className="text-[11px] tabular-nums text-subtle">{c.lastBooking.id}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] tabular-nums text-muted">
                          {c.joinedAt}
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
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
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
                  <button
                    disabled={page >= pages - 1}
                    onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
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

      {selected ? <CustomerDrawer customer={selected} onClose={() => setSelected(null)} /> : null}
    </AppLayout>
  );
}
