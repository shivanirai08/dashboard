"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, RotateCw, TriangleAlert } from "lucide-react";
import type { BookingStatus, DataMode, MechanicStatus } from "@/types";
import { mechanicStatusLabel, statusLabel } from "@/lib/mock-data";

export function useDataMode(delay = 750): [DataMode, (m: DataMode) => void] {
  const [mode, setMode] = useState<DataMode>("loading");
  useEffect(() => {
    const t = setTimeout(() => setMode("ready"), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return [mode, setMode];
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"rounded-xl border border-border bg-surface " + className}>
      {children}
    </section>
  );
}

export function PanelHead({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-subtle">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

const bookingPill: Record<BookingStatus, string> = {
  pending: "bg-pending-soft text-pending",
  assigned: "bg-assigned-soft text-assigned",
  on_the_way: "bg-otw-soft text-otw",
  completed: "bg-done-soft text-done",
  cancelled: "bg-cancelled-soft text-cancelled",
};

const bookingDot: Record<BookingStatus, string> = {
  pending: "bg-pending",
  assigned: "bg-assigned",
  on_the_way: "bg-otw",
  completed: "bg-done",
  cancelled: "bg-cancelled",
};

export function StatusPill({ status }: { status: BookingStatus }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium " +
        bookingPill[status]
      }
    >
      <span className={"h-1.5 w-1.5 rounded-full " + bookingDot[status]} />
      {statusLabel[status]}
    </span>
  );
}

export function StatusDot({ status }: { status: BookingStatus }) {
  return <span className={"h-2 w-2 shrink-0 rounded-full " + bookingDot[status]} />;
}

const mechPill: Record<MechanicStatus, string> = {
  available: "bg-done-soft text-done",
  on_job: "bg-accent-soft text-accent",
  offline: "bg-offline-soft text-offline",
};

const mechDot: Record<MechanicStatus, string> = {
  available: "bg-done",
  on_job: "bg-accent",
  offline: "bg-offline",
};

export function MechanicPill({ status }: { status: MechanicStatus }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium " +
        mechPill[status]
      }
    >
      <span className="relative flex h-1.5 w-1.5">
        {status !== "offline" ? (
          <span
            className={
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 " +
              mechDot[status]
            }
          />
        ) : null}
        <span className={"relative inline-flex h-1.5 w-1.5 rounded-full " + mechDot[status]} />
      </span>
      {mechanicStatusLabel[status]}
    </span>
  );
}

export function Trend({ delta, className = "" }: { delta: number; className?: string }) {
  const up = delta >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums " +
        (up ? "text-done " : "text-cancelled ") +
        className
      }
    >
      <Icon size={13} strokeWidth={2} />
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={"animate-pulse rounded-md bg-surface-3 " + className} />;
}

export function SkeletonLines({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  const heights = [
    "h-24",
    "h-32",
    "h-20",
    "h-40",
    "h-28",
    "h-36",
    "h-24",
    "h-44",
    "h-30",
    "h-32",
  ];
  return (
    <div className="flex h-64 items-end gap-3 px-6 pb-6">
      {heights.map((h, i) => (
        <Skeleton key={i} className={"flex-1 " + h} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center px-6 text-center " +
        (compact ? "py-12" : "py-20")
      }
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-3 text-subtle">
        {icon}
      </div>
      <p className="text-[13px] font-semibold tracking-tight text-foreground">{title}</p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  onRetry,
  compact = false,
}: {
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center px-6 text-center " +
        (compact ? "py-12" : "py-20")
      }
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cancelled-soft text-cancelled">
        <TriangleAlert size={18} strokeWidth={1.5} />
      </div>
      <p className="text-[13px] font-semibold tracking-tight text-foreground">
        Couldn&apos;t reach dispatch
      </p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted">
        The ops feed timed out. Live data may be up to a few minutes stale.
      </p>
      <button
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-3"
      >
        <RotateCw size={13} strokeWidth={2} />
        Retry
      </button>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
    >
      {children}
    </button>
  );
}
