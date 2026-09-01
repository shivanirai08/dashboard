"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChartNoAxesColumn,
  ChevronDown,
  CircleGauge,
  ClipboardList,
  Menu,
  Search,
  Users,
  Wrench,
  X,
} from "lucide-react";
import CommandPalette, { useCommandPalette } from "@/components/layout/command-palette";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: CircleGauge, badge: null },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn, badge: null },
  { href: "/bookings", label: "Bookings", icon: ClipboardList, badge: "37" },
  { href: "/mechanics", label: "Mechanics", icon: Wrench, badge: null },
  { href: "/customers", label: "Customers", icon: Users, badge: null },
];

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
        <Wrench size={15} strokeWidth={2} className="text-white" />
      </span>
      <span className="text-[13px] font-bold tracking-tight text-foreground">
        Instant Mechanic
      </span>
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-5">
        <Logo />
      </div>

      <nav className="flex-1 px-3 pt-2">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium " +
                    (isActive
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-surface-3 hover:text-foreground")
                  }
                >
                  <Icon size={16} strokeWidth={1.5} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3">
        <div className="rounded-lg bg-surface-3 px-3.5 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted">Dispatch load</span>
            <span className="text-xs font-semibold tabular-nums text-accent">78%</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full w-[78%] rounded-full bg-accent" />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-subtle">
            37 pending · 12 mechanics free
          </p>
        </div>
      </div>
    </div>
  );
}

function LivePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-0.5 pl-1.5 pr-2.5">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      <span className="text-[11px] font-semibold tracking-tight text-accent">Ops live</span>
    </span>
  );
}

export default function AppLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const palette = useCommandPalette();

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-surface lg:block">
        <SidebarBody />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/25" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 bg-surface shadow-panel">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3.5 rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-foreground"
              aria-label="Close navigation"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 bg-canvas/95 backdrop-blur-sm">
          <div className="flex h-14 items-center gap-3 border-b border-border bg-surface px-5 sm:px-6 lg:px-7">
            <button
              onClick={() => setOpen(true)}
              className="-ml-1.5 rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              <LivePill />
              {subtitle ? (
                <span className="hidden truncate border-l border-border pl-2.5 text-xs text-subtle lg:block">
                  {subtitle}
                </span>
              ) : null}
            </div>

            <button
              onClick={() => palette.setOpen(true)}
              className="hidden h-8 items-center gap-2 rounded-lg border border-border bg-surface-2 pl-2.5 pr-2 text-xs text-subtle hover:border-border-strong hover:text-muted md:flex"
            >
              <Search size={14} strokeWidth={1.5} />
              <span className="w-28 text-left lg:w-40">Search…</span>
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => palette.setOpen(true)}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-3 hover:text-foreground md:hidden"
              aria-label="Search"
            >
              <Search size={17} strokeWidth={1.5} />
            </button>

            <button
              className="relative rounded-lg p-1.5 text-muted hover:bg-surface-3 hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell size={17} strokeWidth={1.5} />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-surface" />
            </button>

            <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 hover:bg-surface-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-white">
                AK
              </span>
              <span className="hidden text-xs font-medium text-foreground xl:block">
                Alex Karim
              </span>
              <ChevronDown size={14} strokeWidth={1.5} className="hidden text-subtle xl:block" />
            </button>
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-5 py-2.5 sm:px-6 lg:px-7">
              {actions}
            </div>
          ) : null}
        </header>

        <main className="px-5 py-6 sm:px-6 lg:px-7 lg:py-7">{children}</main>
      </div>

      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
    </div>
  );
}
