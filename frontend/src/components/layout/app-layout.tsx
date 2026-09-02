"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  ClipboardList,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  Users,
  Wrench,
  X,
} from "lucide-react";
import CommandPalette, { useCommandPalette } from "@/components/layout/command-palette";
import { useLive } from "@/components/providers/live-provider";
import { useOps } from "@/components/providers/ops-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { PrimaryButton } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: CircleGauge },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/mechanics", label: "Mechanics", icon: Wrench },
  { href: "/customers", label: "Customers", icon: Users },
];

const COLLAPSE_KEY = "im-sidebar-collapsed";

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent">
        <Wrench size={15} strokeWidth={2} className="text-white" />
      </span>
      {!collapsed ? (
        <span className="truncate text-[13px] font-bold tracking-tight text-foreground">
          Instant Mechanic
        </span>
      ) : null}
    </Link>
  );
}

function SidebarBody({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-full flex-col">
      <div className={"flex h-14 items-center " + (collapsed ? "justify-center px-2" : "px-4")}>
        <Logo collapsed={collapsed} />
      </div>

      <nav className={"flex-1 pt-1 " + (collapsed ? "px-2" : "px-3")}>
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
                  title={collapsed ? item.label : undefined}
                  className={
                    "flex items-center rounded-lg text-[13px] font-medium " +
                    (collapsed ? "justify-center px-2 py-2.5 " : "gap-2.5 px-2.5 py-2 ") +
                    (isActive
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-surface-3 hover:text-foreground")
                  }
                >
                  <Icon size={16} strokeWidth={1.5} />
                  {!collapsed ? <span className="flex-1">{item.label}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={"space-y-2 p-3 " + (collapsed ? "px-2" : "")}>
        {onToggleCollapse ? (
          <button
            onClick={onToggleCollapse}
            className={
              "hidden w-full items-center rounded-lg text-[13px] font-medium text-muted hover:bg-surface-3 hover:text-foreground lg:flex " +
              (collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2")
            }
          >
            {collapsed ? (
              <ChevronRight size={16} strokeWidth={1.5} />
            ) : (
              <>
                <ChevronLeft size={16} strokeWidth={1.5} />
                <span>Collapse</span>
              </>
            )}
          </button>
        ) : null}

        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          className={
            "flex w-full items-center rounded-lg text-[13px] font-medium text-muted hover:bg-surface-3 hover:text-foreground " +
            (collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2")
          }
        >
          {theme === "dark" ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          {!collapsed ? <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span> : null}
        </button>

        <div
          className={
            "flex items-center rounded-lg bg-surface-3 " +
            (collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2.5")
          }
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-white dark:text-canvas">
            AK
          </span>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">Alex Karim</p>
              <p className="truncate text-[11px] text-subtle">Dispatch lead</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const palette = useCommandPalette();
  const { openNewBooking } = useOps();
  const {
    connected,
    notifications,
    unreadCount,
    markAllRead,
    markOneRead,
    isUnread,
  } = useLive();

  // List pages already have in-bar search — avoid a second search in the header.
  const hasPageSearch =
    pathname.startsWith("/bookings") ||
    pathname.startsWith("/mechanics") ||
    pathname.startsWith("/customers");

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  const showUnreadDot = unreadCount > 0;

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const sidebarWidth = collapsed ? "lg:w-[72px]" : "lg:w-60";
  const contentPad = collapsed ? "lg:pl-[72px]" : "lg:pl-60";

  return (
    <div className="min-h-screen bg-canvas">
      <aside
        className={
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface transition-[width] duration-200 lg:block " +
          sidebarWidth
        }
      >
        <SidebarBody collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/25" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 bg-surface shadow-panel">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3.5 rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-foreground"
              aria-label="Close navigation"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
            <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className={"transition-[padding] duration-200 " + contentPad}>
        <header className="sticky top-0 z-20 bg-canvas/95 backdrop-blur-sm">
          <div
            className={
              "flex h-14 items-center gap-3 border-b border-border bg-surface px-3 sm:px-4 lg:px-5"
            }
          >
            <button
              onClick={() => setMobileOpen(true)}
              className="-ml-1.5 rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle ? (
                <span className="hidden truncate border-l border-border pl-3 text-[13px] text-muted sm:inline">
                  {subtitle}
                </span>
              ) : null}
            </div>

            {!hasPageSearch ? (
              <>
                <button
                  onClick={() => palette.setOpen(true)}
                  className="hidden h-8 items-center gap-2 rounded-lg border border-border bg-surface-2 pl-2.5 pr-2 text-xs text-subtle hover:border-border-strong hover:text-muted md:flex"
                >
                  <Search size={14} strokeWidth={1.5} />
                  <span className="w-24 text-left lg:w-36">Search…</span>
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
              </>
            ) : null}

            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative rounded-lg p-1.5 text-muted hover:bg-surface-3 hover:text-foreground"
                aria-label={
                  showUnreadDot
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
              >
                <Bell size={17} strokeWidth={1.5} />
                {showUnreadDot ? (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-surface" />
                ) : null}
              </button>
              {notifOpen ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-border bg-surface p-3 shadow-panel">
                    <div className="flex items-center justify-between gap-2 px-1">
                      <p className="text-[11px] font-medium text-subtle">
                        Notifications
                        {showUnreadDot ? (
                          <span className="ml-1.5 text-accent">{unreadCount} new</span>
                        ) : null}
                        <span
                          className={
                            "ml-1.5 inline-block h-1.5 w-1.5 rounded-full " +
                            (connected ? "bg-done" : "bg-subtle")
                          }
                          title={connected ? "Live" : "Reconnecting…"}
                        />
                      </p>
                      {showUnreadDot ? (
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="text-[11px] font-medium text-accent hover:text-accent-hover"
                        >
                          Mark all as read
                        </button>
                      ) : null}
                    </div>
                    <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                      {notifications.map((item) => {
                        const unread = isUnread(item.id);
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => markOneRead(item.id)}
                              className={
                                "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-surface-3 " +
                                (unread ? "font-medium text-foreground" : "text-muted")
                              }
                            >
                              {unread ? (
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                              ) : (
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                              )}
                              <span className="min-w-0 flex-1">{item.text}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              ) : null}
            </div>

            <PrimaryButton onClick={() => openNewBooking()}>
              <Plus size={14} strokeWidth={2} />
              <span className="hidden sm:inline">New booking</span>
              <span className="sm:hidden">New</span>
            </PrimaryButton>
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-2 bg-surface px-3 py-2.5 sm:px-4 lg:px-5">
              {actions}
            </div>
          ) : null}
        </header>

        <main className="px-3 py-5 sm:px-4 lg:px-5 lg:py-6">{children}</main>
      </div>

      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
    </div>
  );
}
