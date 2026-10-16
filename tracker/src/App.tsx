import { NavLink, Route, Routes } from "react-router-dom";
import { ExternalLink, LayoutDashboard, LineChart, Moon, RotateCcw, Settings, Sun, Timer, TriangleAlert } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Mocks from "./pages/Mocks";
import Mistakes from "./pages/Mistakes";
import Revisions from "./pages/Revisions";
import Focus from "./pages/Focus";
import DataPage from "./pages/DataPage";
import { useStore } from "./lib/store";
import { formatClock, usePomodoro } from "./lib/pomodoro";
import { useTheme } from "./lib/theme";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mocks", label: "Mock Analysis", icon: LineChart },
  { to: "/mistakes", label: "Mistake Log", icon: TriangleAlert },
  { to: "/revision", label: "Revision", icon: RotateCcw },
  { to: "/focus", label: "Todo & Focus", icon: Timer },
  { to: "/data", label: "Settings & Sync", icon: Settings },
];

export default function App() {
  const { catalog, sync } = useStore();
  const { theme, toggle } = useTheme();
  const pomo = usePomodoro();
  const h = catalog.hubs;

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen dark:border-white/[.07] dark:bg-[#0e111c]">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-bold text-white">G</div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">GATE Tracker</div>
            <div className="text-xs text-slate-500">{catalog.exam} · {catalog.target}</div>
          </div>
        </div>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-50" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"}`}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 px-2">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Practice on</div>
          {[["GateQA · PYQs", h.gateqaPyq], ["GateQA · Custom mocks", h.gateqaMocks], ["GateOverflow", h.gateoverflow]].map(([l, u]) => (
            <a key={l} href={u} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:text-brand-600">
              {l}<ExternalLink size={13} />
            </a>
          ))}
        </div>

        <div className="mt-auto space-y-3">
          {pomo.running && (
            <NavLink to="/focus" className="block rounded-xl bg-brand-50 px-3 py-2 text-center dark:bg-brand-500/15">
              <div className="text-[11px] uppercase text-brand-600">{pomo.mode === "open" ? "open timer" : pomo.phase} running</div>
              <div className="font-mono text-xl font-semibold text-brand-700 dark:text-brand-50">{formatClock(pomo.remaining)}</div>
            </NavLink>
          )}
          <div className="flex items-center justify-between px-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${sync.status === "synced" ? "bg-emerald-500" : sync.status === "off" ? "bg-slate-300" : "bg-amber-500"}`} />
              {sync.status === "synced" ? "Synced to Supabase" : sync.status === "saving" ? "Saving…" : sync.status === "off" ? "Browser storage" : sync.status === "connecting" ? "Connecting…" : "Sync error"}
            </span>
            <button onClick={toggle} className="icon-btn hover:text-brand-600" aria-label="Toggle theme">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-8 lg:pb-10">
        <div className="mx-auto max-w-5xl">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mocks" element={<Mocks />} />
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/revision" element={<Revisions />} />
            <Route path="/focus" element={<Focus />} />
            <Route path="/data" element={<DataPage />} />
          </Routes>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white/90 backdrop-blur lg:hidden dark:border-white/10 dark:bg-[#0e111c]/90">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} aria-label={label}
            className={({ isActive }) => `flex flex-1 justify-center py-3 ${isActive ? "text-brand-600" : "text-slate-400"}`}>
            <Icon size={20} />
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
