"use client";

import { useMemo, useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import {
  BookingsLine,
  RevenueArea,
  ServiceBars,
  StatusDonut,
  statusColors,
} from "@/components/charts";
import AppLayout from "@/components/layout/app-layout";
import {
  ChartSkeleton,
  ErrorState,
  GhostButton,
  Panel,
  PanelHead,
  Skeleton,
  Trend,
  useDataMode,
} from "@/components/ui";
import {
  compactMoney,
  seriesFor,
  serviceBreakdown,
  statusBreakdown,
} from "@/lib/mock-data";

type Range = "7d" | "30d" | "90d";

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

function RangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-surface-3 p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={
            "rounded-md px-3 py-1.5 text-xs font-medium " +
            (value === r.key
              ? "bg-surface text-foreground shadow-raised"
              : "text-muted hover:text-foreground")
          }
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export default function AnalyticsContent() {
  const [mode, setMode] = useDataMode();
  const [range, setRange] = useState<Range>("30d");
  const data = useMemo(() => seriesFor(range), [range]);

  const totals = useMemo(() => {
    const bookings = data.reduce((s, d) => s + d.bookings, 0);
    const revenue = data.reduce((s, d) => s + d.revenue, 0);
    const completed = data.reduce((s, d) => s + d.completed, 0);
    return { bookings, revenue, completed };
  }, [data]);

  const loading = mode === "loading";
  const error = mode === "error";
  const statusTotal = statusBreakdown.reduce((s, d) => s + d.value, 0);

  return (
    <AppLayout
      title="Analytics"
      subtitle="Demand, revenue and service mix across the fleet"
      actions={
        <>
          <RangeToggle value={range} onChange={setRange} />
          <div className="ml-auto flex items-center gap-2">
            <GhostButton>
              <Download size={14} strokeWidth={1.5} />
              Export CSV
            </GhostButton>
          </div>
        </>
      }
    >
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {[
            { label: "Bookings", value: totals.bookings.toLocaleString("en-US"), delta: 8.4 },
            { label: "Revenue", value: compactMoney(totals.revenue), delta: 11.7 },
            {
              label: "Completion rate",
              value: `${Math.round((totals.completed / totals.bookings) * 100)}%`,
              delta: 1.9,
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

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Panel>
            <PanelHead
              title="Bookings over time"
              subtitle={`Requested vs. completed · last ${range.replace("d", " days")}`}
              right={
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-3.5 rounded-full bg-accent" />
                    Requested
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-3.5 rounded-full bg-subtle" />
                    Completed
                  </span>
                </div>
              }
            />
            {loading ? (
              <ChartSkeleton />
            ) : error ? (
              <ErrorState compact onRetry={() => setMode("ready")} />
            ) : (
              <div className="px-3 py-4">
                <BookingsLine data={data} />
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHead
              title="Revenue over time"
              subtitle="Invoiced value of completed jobs"
              right={
                <span className="inline-flex items-center gap-1.5 rounded-md bg-done-soft px-2 py-1 text-[11px] font-medium text-done">
                  <TrendingUp size={12} strokeWidth={2} />
                  Trending up
                </span>
              }
            />
            {loading ? (
              <ChartSkeleton />
            ) : error ? (
              <ErrorState compact onRetry={() => setMode("ready")} />
            ) : (
              <div className="px-3 py-4">
                <RevenueArea data={data} />
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHead title="Booking status breakdown" subtitle="Share of all jobs in range" />
            {loading ? (
              <ChartSkeleton />
            ) : error ? (
              <ErrorState compact onRetry={() => setMode("ready")} />
            ) : (
              <div className="grid grid-cols-1 items-center gap-2 px-5 py-5 sm:grid-cols-[220px_1fr]">
                <div className="relative">
                  <StatusDonut data={statusBreakdown} />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
                      {statusTotal.toLocaleString("en-US")}
                    </p>
                    <p className="text-[11px] text-subtle">total jobs</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {statusBreakdown.map((s) => (
                    <li key={s.key} className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: statusColors[s.key] }}
                      />
                      <span className="flex-1 text-[13px] text-muted">{s.name}</span>
                      <span className="text-[13px] font-medium tabular-nums text-foreground">
                        {s.value.toLocaleString("en-US")}
                      </span>
                      <span className="w-11 text-right text-[11px] tabular-nums text-subtle">
                        {((s.value / statusTotal) * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHead
              title="Service breakdown"
              subtitle="Jobs by category"
              right={<span className="text-[11px] text-subtle">Top 8 of 14 services</span>}
            />
            {loading ? (
              <ChartSkeleton />
            ) : error ? (
              <ErrorState compact onRetry={() => setMode("ready")} />
            ) : (
              <div className="px-3 py-5">
                <ServiceBars data={serviceBreakdown} />
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AppLayout>
  );
}
