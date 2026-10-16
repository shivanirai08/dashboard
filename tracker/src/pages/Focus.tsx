import { useState } from "react";
import { CalendarClock, CheckCircle2, Clock, Play, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { formatClock, usePomodoro } from "../lib/pomodoro";
import { uid } from "../lib/ids";
import { addDays, daysUntil, formatDate, isSameDay, todayISO } from "../lib/dates";
import { Empty, PageHeader } from "../components/ui";
import TimerControls from "../components/TimerControls";
import { useRemove } from "../lib/undo";
import type { Priority, TodoItem, TodoStatus } from "../lib/types";

const COLS: { key: TodoStatus; label: string; dot: string }[] = [
  { key: "todo", label: "To do", dot: "bg-slate-400" },
  { key: "doing", label: "In progress", dot: "bg-indigo-500" },
  { key: "done", label: "Done", dot: "bg-emerald-500" },
];
const PRIO: Record<Priority, { label: string; cls: string }> = {
  high: { label: "High", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  med: { label: "Med", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  low: { label: "Low", cls: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" },
};
const nextPrio: Record<Priority, Priority> = { low: "med", med: "high", high: "low" };

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const sessionRange = (start: string, end?: string) => {
  const day = new Date(start).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return end ? `${day} · ${clock(start)} – ${clock(end)}` : `${day} · ${clock(start)}`;
};

const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);

export default function Focus() {
  const { state, catalog, setState } = useStore();
  const remove = useRemove();
  const p = usePomodoro();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [prio, setPrio] = useState<Priority>("med");
  const [subj, setSubj] = useState("");

  const add = () => {
    if (!title.trim()) return;
    setState((s) => ({ ...s, todos: [{ id: uid(), title: title.trim(), status: "todo", priority: prio, subject: subj || undefined, due: due || undefined, createdAt: todayISO() }, ...s.todos] }));
    setTitle("");
    setDue("");
  };
  const patch = (id: string, c: Partial<TodoItem>) => setState((s) => ({ ...s, todos: s.todos.map((t) => (t.id === id ? { ...t, ...c } : t)) }));
  const setStatus = (t: TodoItem, status: TodoStatus) => patch(t.id, { status, doneAt: status === "done" ? todayISO() : undefined });
  const extend = (t: TodoItem, days: number) => {
    const base = t.due && t.due >= todayISO() ? t.due : todayISO();
    patch(t.id, { due: addDays(base, days), extensions: (t.extensions ?? 0) + 1, originalDue: t.originalDue ?? t.due });
  };
  const logTime = (t: TodoItem, min: number) => patch(t.id, { timeMin: Math.max(0, (t.timeMin ?? 0) + min) });

  const focusSessions = state.pomodoros.filter((x) => x.kind === "focus");
  const todayMin = focusSessions.filter((x) => isSameDay(x.startedAt)).reduce((a, x) => a + x.minutes, 0);
  const todaySessions = focusSessions.filter((x) => isSameDay(x.startedAt)).length;

  const open_ = p.mode === "open";
  const total = (p.phase === "focus" ? p.focusMin : p.breakMin) * 60;
  const R = 90, C = 2 * Math.PI * R;
  const offset = open_ ? C * ((p.remaining % 3600) / 3600) : C * (p.remaining / total);
  const color = p.phase === "focus" || open_ ? "#6366f1" : "#10b981";

  const rank = { high: 0, med: 1, low: 2 } as const;
  const sortTasks = (a: TodoItem, b: TodoItem) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || rank[a.priority ?? "med"] - rank[b.priority ?? "med"];
  const byStatus = (s: TodoStatus) => {
    const list = state.todos.filter((t) => t.status === s);
    return s === "done" ? list.sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? "")).slice(0, 12) : list.sort(sortTasks);
  };

  const dueChip = (t: TodoItem) => {
    if (!t.due) return null;
    const d = daysUntil(t.due);
    const done = t.status === "done";
    const cls = done ? "bg-slate-100 text-slate-500 dark:bg-white/10" : d < 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : d <= 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
    return <span className={`chip ${cls}`}><CalendarClock size={12} className="mr-1" />{done ? formatDate(t.due) : d < 0 ? `${-d}d overdue` : d === 0 ? "today" : d === 1 ? "tomorrow" : formatDate(t.due)}</span>;
  };

  return (
    <>
      <PageHeader title="Todo & Focus" sub={`${fmtMin(todayMin)} focused today · ${todaySessions} sessions`} />

      <div className="grid gap-4 md:grid-cols-5">
        <div className="card flex flex-col items-center md:col-span-2">
          <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[.03]">
            {([["pomodoro", "Pomodoro"], ["open", "Open timer"]] as const).map(([m, l]) => (
              <button key={m} onClick={() => p.setMode(m)} className={`cursor-pointer rounded-lg px-4 py-1 text-sm ${p.mode === m ? "bg-brand-500 text-white" : "text-slate-500"}`}>{l}</button>
            ))}
          </div>
          <div className="relative size-52">
            <svg viewBox="0 0 200 200" className="size-full -rotate-90">
              <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-white/5" />
              <circle cx="100" cy="100" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - offset} style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div className="absolute inset-0 grid place-content-center text-center">
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{open_ ? "stopwatch" : p.phase}</div>
              <div className="font-mono text-5xl font-bold text-slate-900 dark:text-white">{formatClock(p.remaining)}</div>
            </div>
          </div>
          <div className="mt-4"><TimerControls /></div>
          <input className="input mt-4" placeholder="What are you working on?" value={p.label} onChange={(e) => p.setLabel(e.target.value)} />
          <select className="input mt-2" value={p.subject} onChange={(e) => p.setSubject(e.target.value)}>
            <option value="">Subject (optional)</option>{catalog.subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
          {p.taskId && <div className="mt-2 text-xs text-indigo-500">Time will be added to this task</div>}
          <div className={`mt-4 flex gap-3 text-xs text-slate-500 ${open_ ? "hidden" : ""}`}>
            <label>Focus min <input className="input !w-16 !py-1" type="number" min={1} value={p.focusMin} onChange={(e) => p.setFocusMin(Math.max(1, Number(e.target.value)))} /></label>
            <label>Break min <input className="input !w-16 !py-1" type="number" min={1} value={p.breakMin} onChange={(e) => p.setBreakMin(Math.max(1, Number(e.target.value)))} /></label>
          </div>
        </div>

        <div className="card md:col-span-3">
          <div className="card-title">Session log</div>
          {focusSessions.slice(0, 8).map((x) => (
            <div key={x.id} className="flex items-center gap-3 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5">
              <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{fmtMin(x.minutes)}</span>
              <span className="min-w-0 flex-1 truncate text-slate-900 dark:text-white">{x.label ?? "Focus session"}{x.subject && <span className="ml-2 text-xs text-slate-400">{x.subject}</span>}</span>
              <span className="whitespace-nowrap text-xs text-slate-400">{sessionRange(x.startedAt, x.endedAt)}</span>
            </div>
          ))}
          {!focusSessions.length && <Empty icon={<Play size={28} />} text="Finished sessions show up here" />}
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex flex-wrap gap-2">
          <input className="input min-w-0 flex-1" placeholder="Add a task and press Enter…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <select className="input !w-44" value={subj} onChange={(e) => setSubj(e.target.value)}>
            <option value="">No subject</option>{catalog.subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className="input !w-40" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <button className={`chip cursor-pointer ${PRIO[prio].cls}`} onClick={() => setPrio(nextPrio[prio])} title="Click to change priority">{PRIO[prio].label} priority</button>
          <button className="btn" onClick={add}>Add</button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {COLS.map((col) => {
          const list = byStatus(col.key);
          return (
            <div key={col.key} className="rounded-2xl bg-slate-200/50 p-3 dark:bg-white/[.03]">
              <div className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <span className={`size-2 rounded-full ${col.dot}`} />{col.label}
                <span className="ml-auto text-xs font-normal text-slate-400">{state.todos.filter((t) => t.status === col.key).length}</span>
              </div>
              <div className="space-y-3">
                {list.map((t) => (
                  <div key={t.id} className="card !p-3">
                    <div className="flex items-start gap-2">
                      <input className={`w-full min-w-0 bg-transparent text-sm font-medium outline-none ${t.status === "done" ? "text-slate-500" : "text-slate-900 dark:text-white"}`} value={t.title} onChange={(e) => patch(t.id, { title: e.target.value })} />
                      <button className="icon-btn !size-6 shrink-0" aria-label="Delete" onClick={() => remove("todos", t.id, "Task")}><Trash2 size={13} /></button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <button className={`chip cursor-pointer ${PRIO[t.priority ?? "med"].cls}`} onClick={() => patch(t.id, { priority: nextPrio[t.priority ?? "med"] })} title="Change priority">{PRIO[t.priority ?? "med"].label}</button>
                      {t.subject && <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{t.subject}</span>}
                      {dueChip(t)}
                      {!!t.extensions && <span className="chip bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" title={t.originalDue ? `Originally ${formatDate(t.originalDue)}` : undefined}>extended ×{t.extensions}</span>}
                      {!!t.timeMin && <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"><Clock size={12} className="mr-1" />{fmtMin(t.timeMin)}</span>}
                    </div>

                    {t.status !== "done" && (
                      <div className="mt-2 space-y-1.5 text-xs">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="w-14 text-slate-400">Deadline</span>
                          <input type="date" className="input !w-auto !px-2 !py-0.5 !text-xs" value={t.due ?? ""} onChange={(e) => patch(t.id, { due: e.target.value || undefined })} />
                          {t.due && [1, 3, 7].map((d) => <button key={d} className="chip cursor-pointer border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10" onClick={() => extend(t, d)}>+{d}d</button>)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="w-14 text-slate-400">Log time</span>
                          {[15, 30, 60].map((m) => <button key={m} className="chip cursor-pointer border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10" onClick={() => logTime(t, m)}>+{m}m</button>)}
                          <button className="chip cursor-pointer border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10" onClick={() => { const v = Number(prompt("Minutes to add (negative to subtract)")); if (v) logTime(t, v); }}>custom</button>
                          <button className="chip ml-auto cursor-pointer bg-indigo-600 text-white hover:brightness-110" onClick={() => p.focusOnTask(t.id, t.title, t.subject)}><Play size={11} className="mr-1" />Focus</button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-white/10">
                      {COLS.map((c) => (
                        <button key={c.key} onClick={() => setStatus(t, c.key)} className={`flex-1 cursor-pointer rounded-md py-1 ${t.status === c.key ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"}`}>{c.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {!list.length && <div className="py-6 text-center text-xs text-slate-400">{col.key === "done" ? <><CheckCircle2 className="mx-auto mb-1" size={18} />Nothing finished yet</> : "Empty"}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
