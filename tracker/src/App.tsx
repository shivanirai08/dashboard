import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Ellipsis, LayoutDashboard, LineChart, ListChecks, Moon, RotateCcw, Settings, Sun, TriangleAlert } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Mocks from "./pages/Mocks";
import MockDetail from "./pages/MockDetail";
import Mistakes from "./pages/Mistakes";
import SubjectNotes from "./pages/SubjectNotes";
import Revisions from "./pages/Revisions";
import Schedule from "./pages/Schedule";
import DataPage from "./pages/DataPage";
import { useStore } from "./lib/store";
import { formatClock, usePomodoro } from "./lib/pomodoro";
import { useTheme } from "./lib/theme";
import { todayISO } from "./lib/dates";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schedule", label: "Schedule & Tasks", short: "Schedule", icon: CalendarDays },
  { to: "/mocks", label: "Mocks & Tests", icon: LineChart },
  { to: "/notes", label: "Subject Notes", short: "Notes", icon: ListChecks },
  { to: "/mistakes", label: "Mistake Log", short: "Mistakes", icon: TriangleAlert },
  { to: "/revision", label: "Revision", icon: RotateCcw },
  { to: "/data", label: "Settings & Sync", short: "Settings", icon: Settings },
];

export default function App() {
  const { catalog, sync, state } = useStore();
  const { theme, toggle } = useTheme();
  const pomo = usePomodoro();
  const nav = useNavigate();
  const today = todayISO();
  const [more, setMore] = useState(false);
  const loc = useLocation();
  useEffect(() => setMore(false), [loc.pathname]);
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [more]);
  // glanceable counts on the nav, so you don't have to open a page to know it needs you
  const badge: Record<string, number> = {
    "/revision": state.todos.filter((t) => t.revision && t.status !== "done" && (t.planned ?? today) <= today).length,
    "/mistakes": state.mistakes.filter((m) => !m.resolved).length,
  };

  // N = new task · Space = start/pause timer (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName) || el.isContentEditable || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('[aria-modal="true"]')) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        nav("/schedule?new=1");
      } else if (e.key === " ") {
        e.preventDefault();
        if (pomo.running) pomo.pause();
        else pomo.start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, pomo]);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200/80 bg-white px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen dark:border-white/[.07] dark:bg-panel">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="grid size-9 place-items-center rounded-xl bg-brand-600 text-sm font-bold text-white">G</div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">GATE Tracker</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{catalog.exam} · {catalog.target}</div>
          </div>
        </div>
        <nav aria-label="Main" className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-50" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"}`}>
              <Icon size={18} />{label}{!!badge[to] && <span className="ml-auto rounded-full bg-slate-200 px-1.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300" aria-label={`${badge[to]} pending`}>{badge[to]}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="px-2 text-[11px] leading-5 text-slate-400">
            <kbd className="rounded border border-slate-300 px-1 dark:border-white/20">N</kbd> new task ·{" "}
            <kbd className="rounded border border-slate-300 px-1 dark:border-white/20">Space</kbd> start/pause
          </div>
          {pomo.started && (
            <NavLink to="/" className="block rounded-xl bg-brand-50 px-3 py-2 text-center dark:bg-brand-500/15">
              <div className="text-[11px] uppercase text-brand-600 dark:text-brand-300">{pomo.running ? "focus running" : "focus paused"}</div>
              <div className="font-mono text-xl font-semibold text-brand-700 dark:text-brand-50">{formatClock(pomo.elapsed)}</div>
            </NavLink>
          )}
          <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${sync.status === "synced" ? "bg-emerald-500" : sync.status === "off" ? "bg-slate-300" : "bg-amber-500"}`} />
              {sync.status === "synced" ? "Synced to Supabase" : sync.status === "saving" ? "Saving…" : sync.status === "off" ? "Browser storage" : sync.status === "connecting" ? "Connecting…" : "Sync error"}
            </span>
            <button onClick={toggle} className="icon-btn hover:text-brand-600" aria-label="Toggle theme">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10 xl:px-10">
        <div className="mx-auto max-w-[1560px]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/mocks" element={<Mocks />} />
            <Route path="/mocks/:id" element={<MockDetail />} />
            <Route path="/notes" element={<SubjectNotes />} />
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/revision" element={<Revisions />} />
            <Route path="/focus" element={<Navigate to="/schedule" replace />} />
            <Route path="/data" element={<DataPage />} />
          </Routes>
        </div>
      </main>

      {pomo.started && (
        <NavLink to="/" className="fixed bottom-[4.25rem] right-3 z-10 flex items-center gap-2 rounded-full bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg lg:hidden" aria-label={`Focus ${pomo.running ? "running" : "paused"} ${formatClock(pomo.elapsed)}`}>
          <span className={`size-2 rounded-full bg-white ${pomo.running ? "animate-pulse" : "opacity-50"}`} aria-hidden /><span className="font-mono tabular-nums">{formatClock(pomo.elapsed)}</span>
        </NavLink>
      )}
      {more && <div className="fixed inset-0 z-10 lg:hidden" onClick={() => setMore(false)} aria-hidden />}
      {more && (
        <div id="more-nav" className="fixed inset-x-3 bottom-[4.25rem] z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl lg:hidden dark:border-white/10 dark:bg-panel">
          {links.slice(4).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-50" : "text-slate-700 dark:text-slate-200"}`}>
              <Icon size={18} />{label}{!!badge[to] && <span className="ml-auto rounded-full bg-slate-200 px-1.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">{badge[to]}</span>}
            </NavLink>
          ))}
          <button type="button" onClick={toggle} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}{theme === "dark" ? "Light" : "Dark"} theme</button>
        </div>
      )}
      <nav aria-label="Main mobile" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white lg:hidden dark:border-white/10 dark:bg-panel">
        {links.slice(0, 4).map(({ to, label, short, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${isActive ? "text-brand-600 dark:text-brand-300" : "text-slate-500 dark:text-slate-400"}`}>
            <span className="relative"><Icon size={20} />{!!badge[to] && <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-semibold leading-4 text-white" >{badge[to]}</span>}</span>{short ?? label.split(" ")[0]}{!!badge[to] && <span className="sr-only"> ({badge[to]} pending)</span>}
          </NavLink>
        ))}
        <button type="button" aria-expanded={more} aria-controls="more-nav" onClick={() => setMore((v) => !v)}
          className={`relative flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${more || links.slice(4).some((l) => l.to === loc.pathname) ? "text-brand-600 dark:text-brand-300" : "text-slate-500 dark:text-slate-400"}`}>
          <span className="relative"><Ellipsis size={20} />{(badge["/revision"] + badge["/mistakes"]) > 0 && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-rose-500" aria-hidden />}</span>More
        </button>
      </nav>
    </div>
  );
}
