"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCheck,
  CircleDollarSign,
  Clock3,
  Hourglass,
  Inbox,
  Plus,
  UserPlus,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { BookingsLine, RevenueArea } from "@/components/charts";
import AppLayout from "@/components/layout/app-layout";
import {
  ChartSkeleton,
  EmptyState,
  ErrorState,
  Panel,
  PanelHead,
  PrimaryButton,
  Skeleton,
  SkeletonLines,
  StatusDot,
  StatusPill,
  Trend,
  useDataMode,
} from "@/components/ui";
import { activity, kpis, money, recentBookings, series30 } from "@/lib/mock-data";

const ICONS = {
  calendar: CalendarDays,
  clock: Clock3,
  check: CheckCheck,
  hourglass: Hourglass,
  x: XCircle,
  revenue: CircleDollarSign,
  wrench: Wrench,
  users: UserPlus,
};

const DRILL: Record<string, string> = {
  total: "/bookings",
  today: "/bookings",
  completed: "/bookings?status=completed",
  pending: "/bookings?status=pending",
  cancelled: "/bookings?status=cancelled",
  revenue: "/analytics",
  mechanics: "/mechanics",
  customers: "/customers",
};

const RAIL =
  "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4 xl:grid-cols-8";

function KpiRail() {
  return (
    <div className={RAIL}>
      {kpis.map((k) => {
        const Icon = ICONS[k.icon];
        return (
          <Link
            key={k.key}
            href={DRILL[k.key]}
            className="group relative block bg-surface px-4 py-4 hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2"
          >
            <span
              className={
                "absolute inset-x-0 top-0 h-0.5 " +
                (k.tone === "accent" ? "bg-accent" : "bg-transparent")
              }
            />
            <div className="flex items-center gap-1.5">
              <Icon size={13} strokeWidth={1.5} className="text-subtle group-hover:text-accent" />
              <p className="truncate text-[11px] font-medium text-muted">{k.label}</p>
              <ArrowRight
                size={12}
                strokeWidth={2}
                className="ml-auto text-accent opacity-0 group-hover:opacity-100"
              />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {k.value}
            </p>
            <Trend delta={k.delta} className="mt-1" />
          </Link>
        );
      })}
    </div>
  );
}

function KpiRailSkeleton() {
  return (
    <div className={RAIL}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-surface px-4 py-4">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-3 h-6 w-16" />
          <Skeleton className="mt-2 h-2.5 w-10" />
        </div>
      ))}
    </div>
  );
}

function KpiRailEmpty() {
  return (
    <div className={RAIL}>
      {kpis.map((k) => (
        <div key={k.key} className="bg-surface px-4 py-4">
          <p className="truncate text-[11px] font-medium text-muted">{k.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-border-strong">
            —
          </p>
          <p className="mt-1 text-[11px] text-subtle">No data yet</p>
        </div>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={"h-0.5 w-3.5 rounded-full " + i.className} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export default function OverviewContent() {
  const [mode, setMode] = useDataMode();
  const loading = mode === "loading";
  const empty = mode === "empty";
  const error = mode === "error";

  return (
    <AppLayout
      title="Live Ops"
      subtitle="Sat 14 Feb 2026 · SF Bay region"
      actions={
        <>
          <PrimaryButton>
            <Plus size={14} strokeWidth={2} />
            New booking
          </PrimaryButton>
          <Link
            href="/bookings?status=pending"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-pending-soft px-3 text-xs font-medium text-pending hover:bg-pending-soft/70"
          >
            37 jobs awaiting dispatch
            <ArrowRight size={13} strokeWidth={2} />
          </Link>
          <span className="ml-auto text-xs text-subtle">Synced 12s ago</span>
        </>
      }
    >
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5">
        {loading ? <KpiRailSkeleton /> : empty ? <KpiRailEmpty /> : <KpiRail />}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Panel>
            <PanelHead
              title="Bookings over time"
              subtitle="Last 30 days"
              right={
                <Legend
                  items={[
                    { label: "Requested", className: "bg-accent" },
                    { label: "Completed", className: "bg-subtle" },
                  ]}
                />
              }
            />
            {loading ? (
              <ChartSkeleton />
            ) : error ? (
              <ErrorState compact onRetry={() => setMode("ready")} />
            ) : empty ? (
              <EmptyState
                compact
                icon={<CalendarDays size={18} strokeWidth={1.5} />}
                title="No bookings in this window"
                body="Once jobs start coming in, the 30-day trend plots here."
              />
            ) : (
              <div className="px-3 py-4">
                <BookingsLine data={series30} />
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHead
              title="Revenue over time"
              subtitle="Last 30 days · net of cancellations"
              right={
                <div className="flex items-baseline gap-2">
                  <p className="text-[13px] font-semibold tabular-nums tracking-tight text-foreground">
                    $284,140
                  </p>
                  <Trend delta={11.7} />
                </div>
              }
            />
            {loading ? (
              <ChartSkeleton />
            ) : error ? (
              <ErrorState compact onRetry={() => setMode("ready")} />
            ) : empty ? (
              <EmptyState
                compact
                icon={<CircleDollarSign size={18} strokeWidth={1.5} />}
                title="No revenue recorded"
                body="Completed jobs contribute as soon as they're invoiced."
              />
            ) : (
              <div className="px-3 py-4">
                <RevenueArea data={series30} />
              </div>
            )}
          </Panel>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
          <Panel className="overflow-hidden">
            <PanelHead
              title="Recent bookings"
              subtitle="Newest five jobs across all zones"
              right={
                <Link
                  href="/bookings"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
                >
                  View all
                  <ArrowRight size={13} strokeWidth={2} />
                </Link>
              }
            />
            {loading ? (
              <SkeletonLines rows={5} />
            ) : error ? (
              <ErrorState compact onRetry={() => setMode("ready")} />
            ) : empty ? (
              <EmptyState
                compact
                icon={<Inbox size={18} strokeWidth={1.5} />}
                title="No bookings yet"
                body="New jobs land here the moment a customer requests roadside help."
                action={
                  <PrimaryButton>
                    <Plus size={14} strokeWidth={2} />
                    Create booking
                  </PrimaryButton>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentBookings.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={"/bookings?q=" + encodeURIComponent(b.id)}
                      className="group flex items-center gap-4 px-5 py-3 hover:bg-surface-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium tracking-tight text-foreground">
                          {b.customer}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] tabular-nums text-subtle">
                          {b.id} · {b.vehicle} · {b.service}
                        </p>
                      </div>
                      <p className="hidden w-28 shrink-0 truncate text-xs text-muted md:block">
                        {b.mechanic ?? <span className="text-subtle">Unassigned</span>}
                      </p>
                      <StatusPill status={b.status} />
                      <p className="w-16 shrink-0 text-right text-[13px] font-medium tabular-nums text-foreground">
                        {money(b.amount)}
                      </p>
                      <ArrowRight
                        size={13}
                        strokeWidth={2}
                        className="shrink-0 text-accent opacity-0 group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHead
              title="Live activity"
              subtitle="Status changes as they happen"
              right={
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent">
                  <Zap size={12} strokeWidth={2} />
                  Streaming
                </span>
              }
            />
            {loading ? (
              <SkeletonLines rows={5} />
            ) : error ? (
              <ErrorState compact onRetry={() => setMode("ready")} />
            ) : empty ? (
              <EmptyState
                compact
                icon={<Zap size={18} strokeWidth={1.5} />}
                title="Nothing happening yet"
                body="Assignments, arrivals and completions stream in here in real time."
              />
            ) : (
              <ul className="py-2">
                {activity.map((a, i) => (
                  <li key={a.id}>
                    <Link
                      href={"/bookings?q=" + encodeURIComponent(a.bookingId)}
                      className="group relative flex gap-3 px-5 py-2 hover:bg-surface-2"
                    >
                      {i < activity.length - 1 ? (
                        <span className="absolute left-[25px] top-6 h-full w-px bg-border" />
                      ) : null}
                      <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
                        {a.live ? (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                        ) : null}
                        <StatusDot status={a.status} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-snug text-foreground">{a.text}</p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-subtle">
                          {a.bookingId} · {a.ago}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>
      </div>
    </AppLayout>
  );
}
