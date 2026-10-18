import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Inbox, KanbanSquare, Plus, Repeat, Target } from "lucide-react";
import { useStore } from "../lib/store";
import { useRemove } from "../lib/undo";
import { useTasks } from "../lib/useTasks";
import { addDays, daysUntil, isSameDay, todayISO } from "../lib/dates";
import { Empty, PageHeader } from "../components/ui";
import { NotesButton } from "../components/TaskNotes";
import TaskDialog, { type TaskDraft } from "../components/TaskDialog";
import TaskBoard, { DRAG_TASK } from "../components/TaskBoard";
import PlayButton from "../components/PlayButton";
import { clock12, dayStats, fmtDur, fromMin, layoutLanes, monthDates, toMin, weekDates, weekStartOf, type DayStats } from "../lib/schedule";
import { columnOf, dayCounter, missedOn, overdueDay, phaseOf, plannedMin, tasksBetween } from "../lib/tasks";
import type { TodoItem } from "../lib/types";

type Range = "day" | "week" | "month";
type View = "calendar" | "board";
const HOUR_PX = 56;
const END_H = 24;

const longDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
const shortDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const weekday = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
const monthName = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const relLabel = (iso: string) => {
  const d = daysUntil(iso);
  return d === 0 ? "Today" : d === 1 ? "Tomorrow" : d === -1 ? "Yesterday" : null;
};

function pref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function savePref(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch { /* ignore */ }
}

/** emerald = done, amber = date passed & unfinished, indigo = still to come */
function tone(t: TodoItem, today: string) {
  if (t.status === "done") return { box: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100", bar: "bg-emerald-500" };
  if ((t.planned ?? t.due ?? today) < today) return { box: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100", bar: "bg-amber-500" };
  return { box: "border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-100", bar: "bg-brand-500" };
}

const dropProps = (onDrop: (id: string) => void) => ({
  onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes(DRAG_TASK)) e.preventDefault(); },
  onDrop: (e: React.DragEvent) => {
    const id = e.dataTransfer.getData(DRAG_TASK);
    if (id) { e.preventDefault(); onDrop(id); }
  },
});
const dragProps = (id: string) => ({ draggable: true, onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData(DRAG_TASK, id); e.dataTransfer.effectAllowed = "move"; } });

export default function Schedule() {
  const { state } = useStore();
  const remove = useRemove();
  const { toggleDone, reschedule } = useTasks();
  const today = todayISO();
  const [params, setParams] = useSearchParams();
  const [range, setRangeRaw] = useState<Range>(() => pref("sched-range", ["day", "week", "month"] as const, "day"));
  const [view, setViewRaw] = useState<View>(() => pref("sched-view", ["calendar", "board"] as const, "calendar"));
  const [date, setDate] = useState(today);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [now, setNow] = useState(() => new Date());
  const setRange = (r: Range) => { setRangeRaw(r); savePref("sched-range", r); };
  const setView = (v: View) => { setViewRaw(v); savePref("sched-view", v); };

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // /schedule?new=1 (dashboard button, "N" shortcut) opens the add dialog
  useEffect(() => {
    if (params.get("new")) {
      setDraft({ planned: date });
      setParams({}, { replace: true });
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (dir: -1 | 1) => {
    if (range === "month") {
      const first = `${date.slice(0, 7)}-01`;
      setDate(dir === 1 ? `${addDays(first, 32).slice(0, 7)}-01` : `${addDays(first, -1).slice(0, 7)}-01`);
    } else setDate(addDays(date, dir * (range === "day" ? 1 : 7)));
  };

  const dates = range === "day" ? [date] : range === "week" ? weekDates(date) : monthDates(date).filter((d) => d.slice(0, 7) === date.slice(0, 7));
  const heading = range === "day" ? longDay(date) : range === "week" ? `${shortDay(weekStartOf(date))} – ${shortDay(addDays(weekStartOf(date), 6))}` : monthName(date);
  const isCurrent = range === "day" ? date === today : range === "week" ? weekStartOf(date) === weekStartOf(today) : date.slice(0, 7) === today.slice(0, 7);
  const stats = dates.map((d) => dayStats(state, d, today));
  const inRange = tasksBetween(state, dates[0], dates[dates.length - 1], today);
  const backlog = state.todos.filter((t) => columnOf(t, today) === "backlog");

  const openNew = (extra: TaskDraft = {}) => setDraft({ planned: date, ...extra });
  const del = (t: TodoItem) => { setDraft(null); remove("todos", t.id, "Task"); };
  const moveToDay = (id: string, d: string) => {
    const t = state.todos.find((x) => x.id === id);
    if (t && t.planned !== d) reschedule(id, d, t.start);
  };

  return (
    <>
      <PageHeader title="Schedule" sub="Every task lives here — on the calendar by day, or on the board by status. Same tasks, two views.">
        <button className="btn" onClick={() => openNew()}><Plus size={16} />New task</button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/[.03]">
          <button className="icon-btn !text-slate-500 hover:!text-slate-900 dark:hover:!text-white" aria-label={`Previous ${range}`} onClick={() => move(-1)}><ChevronLeft size={18} /></button>
          <button className="cursor-pointer rounded-lg px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-white/10" disabled={isCurrent} onClick={() => setDate(today)}>Today</button>
          <button className="icon-btn !text-slate-500 hover:!text-slate-900 dark:hover:!text-white" aria-label={`Next ${range}`} onClick={() => move(1)}><ChevronRight size={18} /></button>
        </div>
        <h2 className="mr-1 min-w-0 text-lg font-semibold text-slate-900 dark:text-white" aria-live="polite">
          {heading}
          {range === "day" && relLabel(date) && <span className="chip ml-2 bg-brand-50 align-middle text-brand-700 dark:bg-brand-500/15 dark:text-brand-50">{relLabel(date)}</span>}
        </h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {range === "day" && <input type="date" className="input !w-auto" aria-label="Jump to date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />}
          <Segmented label="Duration" value={range} onChange={setRange} options={[["day", "Day"], ["week", "Week"], ["month", "Month"]]} />
          <Segmented label="View" value={view} onChange={setView} options={[["calendar", "Calendar", CalendarDays], ["board", "Board", KanbanSquare]]} />
        </div>
      </div>

      {view === "calendar" && range === "day" && <DayView date={date} today={today} now={now} stats={stats[0]} backlog={backlog} onEdit={setDraft} onNew={openNew} onToggle={toggleDone} />}
      {view === "calendar" && range === "week" && <WeekView stats={stats} today={today} onOpen={(d) => { setDate(d); setRange("day"); }} onEdit={setDraft} onNew={(d) => setDraft({ planned: d })} onToggle={toggleDone} onMove={moveToDay} />}
      {view === "calendar" && range === "month" && <MonthView stats={stats} month={date.slice(0, 7)} today={today} onOpen={(d) => { setDate(d); setRange("day"); }} onEdit={setDraft} onMove={moveToDay} />}
      {view === "calendar" && range !== "day" && <BacklogTray tasks={backlog} onEdit={setDraft} />}

      {view === "board" && <TaskBoard tasks={[...inRange, ...backlog]} onEdit={setDraft} onDelete={del} />}

      {(view === "board" || range !== "day") && <RangeSummary stats={stats} tasks={inRange} today={today} range={range} chart={range !== "day"} />}

      {draft && <TaskDialog key={draft.id ?? "new"} draft={draft} onClose={() => setDraft(null)} onDelete={del} />}
    </>
  );
}

function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, string, typeof Check?])[] }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[.03]">
      {options.map(([v, l, Icon]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-sm transition ${value === v ? "bg-brand-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{Icon && <Icon size={14} />}{l}</button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Day                                                                 */
/* ------------------------------------------------------------------ */

type DayProps = {
  date: string; today: string; now: Date; stats: DayStats; backlog: TodoItem[];
  onEdit: (t: TodoItem) => void;
  onNew: (extra?: TaskDraft) => void;
  onToggle: (t: TodoItem) => void;
};

function DayView({ date, today, now, stats, backlog, onEdit, onNew, onToggle }: DayProps) {
  const { state } = useStore();
  const { reschedule } = useTasks();
  const scroller = useRef<HTMLDivElement>(null);
  const timed = stats.timed;
  const timedIds = new Set(timed.map((t) => t.id));
  // carried-over, multi-day and untimed tasks have no slot of their own today
  const strip = stats.tasks.filter((t) => !timedIds.has(t.id));
  const startH = Math.min(6, ...timed.map((t) => Math.floor(toMin(t.start!) / 60)));
  const hours = Array.from({ length: END_H - startH }, (_, i) => startH + i);
  // faded copies of tasks that were left unfinished on this day and moved on
  const ghosts = missedOn(state, date);
  const ghostTimed = ghosts.filter((g) => g.slot.start && g.slot.end);
  const ghostStrip = ghosts.filter((g) => !(g.slot.start && g.slot.end));
  const lanes = layoutLanes([...timed, ...ghostTimed.map((g) => ({ id: `ghost-${g.task.id}`, start: g.slot.start, end: g.slot.end }))]);
  const isToday = date === today;
  const past = date < today;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const missed = timed.filter((t) => t.status !== "done");

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const focusMin = isToday ? nowMin - 60 : timed.length ? toMin(timed[0].start!) - 30 : 8 * 60;
    el.scrollTop = Math.max(0, ((focusMin - startH * 60) / 60) * HOUR_PX);
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const clickGrid = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const s = Math.min(23 * 60, startH * 60 + Math.floor(((y / HOUR_PX) * 60) / 30) * 30);
    onNew({ start: fromMin(s), end: fromMin(Math.min(24 * 60, s + 60)) });
  };
  const dropOnGrid = (id: string, e: React.DragEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    reschedule(id, date, fromMin(Math.min(23 * 60, startH * 60 + Math.floor(((y / HOUR_PX) * 60) / 15) * 15)));
  };

  const carryOver = () => missed.forEach((t) => reschedule(t.id, today));
  const sessions = state.pomodoros.filter((p) => p.kind === "focus" && isSameDay(p.startedAt, date));
  const mocks = state.mocks.filter((m) => m.date === date);
  const taskName = (id?: string) => (id ? state.todos.find((t) => t.id === id)?.title : undefined);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="card !p-0 overflow-hidden">
        {past && missed.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertCircle size={15} />{missed.length} task{missed.length > 1 ? "s" : ""} weren’t finished.
            <button className="ml-auto cursor-pointer font-semibold underline-offset-2 hover:underline" onClick={carryOver}>Move to today</button>
          </div>
        )}
        {(strip.length > 0 || ghostStrip.length > 0) && (
          <div className="border-b border-slate-100 px-4 py-2.5 dark:border-white/[.06]">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">In progress · carried over</div>
            <div className="flex flex-wrap gap-2">
              {ghostStrip.map(({ task: t }) => (
                <div key={`ghost-${t.id}`} className="flex max-w-full items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-2 py-1 text-sm text-amber-900/70 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-100/70">
                  <button className="min-w-0 cursor-pointer truncate text-left font-medium" onClick={() => onEdit(t)}>{t.title}</button>
                  <span className="shrink-0 text-[11px] font-semibold">not finished · moved to {shortDay(t.planned ?? today)}</span>
                </div>
              ))}
              {strip.map((t) => {
                const late = phaseOf(t, today) === "overdue";
                const counter = dayCounter(t, date);
                return (
                  <div key={t.id} {...dragProps(t.id)} className={`flex max-w-full items-center gap-2 rounded-lg border px-2 py-1 text-sm ${late ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100" : tone(t, today).box}`}>
                    <input type="checkbox" className="size-4 shrink-0 cursor-pointer accent-emerald-600" checked={t.status === "done"} onChange={() => onToggle(t)} aria-label={`Mark “${t.title}” ${t.status === "done" ? "not done" : "done"}`} />
                    <button className={`min-w-0 cursor-pointer truncate text-left font-medium ${t.status === "done" ? "line-through opacity-70" : ""}`} onClick={() => onEdit(t)}>{t.revision && <Repeat size={12} className="mr-1 inline" aria-label="Revision" />}{t.title}</button>
                    {late && <span className="shrink-0 text-[11px] font-semibold">{-daysUntil(t.due ?? t.planned ?? today)}d overdue</span>}
                    {counter && <span className="shrink-0 text-[11px] opacity-70">{counter}</span>}
                    {overdueDay(t, today) && <span className="shrink-0 rounded bg-rose-100 px-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">Overdue day {overdueDay(t, today)}</span>}
                    {late && isToday && <button className="shrink-0 cursor-pointer text-[11px] font-semibold underline-offset-2 hover:underline" onClick={() => reschedule(t.id, today)}>Move to today</button>}
                    <NotesButton task={t} className="!size-6" />
                    <PlayButton task={t} className="!size-6" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div ref={scroller} className="max-h-[68vh] min-h-[420px] overflow-y-auto">
          <div className="relative ml-14 mr-3 cursor-copy" style={{ height: hours.length * HOUR_PX }} onClick={clickGrid} title="Click an empty slot to add a task"
            {...dropProps(() => {})} onDrop={(e) => { const id = e.dataTransfer.getData(DRAG_TASK); if (id) { e.preventDefault(); dropOnGrid(id, e); } }}>
            {hours.map((h, i) => (
              <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-slate-100 dark:border-white/[.06]" style={{ top: i * HOUR_PX }}>
                <span className="absolute -left-12 -top-2 w-10 text-right text-[11px] tabular-nums text-slate-400">{i ? clock12(fromMin(h * 60)) : ""}</span>
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-100/70 dark:border-white/[.03]" />
              </div>
            ))}

            {isToday && nowMin >= startH * 60 && (
              <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((nowMin - startH * 60) / 60) * HOUR_PX }}>
                <span className="-ml-1 size-2 rounded-full bg-rose-500" /><span className="h-px flex-1 bg-rose-500" />
              </div>
            )}

            {ghostTimed.map(({ task: t, slot }) => {
              const { lane, lanes: n } = lanes.get(`ghost-${t.id}`) ?? { lane: 0, lanes: 1 };
              const top = ((toMin(slot.start!) - startH * 60) / 60) * HOUR_PX;
              const height = Math.max(24, ((toMin(slot.end!) - toMin(slot.start!)) / 60) * HOUR_PX - 2);
              return (
                <div key={`ghost-${t.id}`} className="absolute cursor-pointer overflow-hidden rounded-lg border border-dashed border-amber-300 bg-amber-50/50 text-left text-amber-900/70 transition hover:bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-100/70"
                  style={{ top, height, left: `calc(${(lane / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` }} onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
                  <span className="absolute inset-y-0 left-0 w-1 bg-amber-400/60" />
                  <div className="py-1 pl-3 pr-2">
                    <div className="truncate text-sm font-semibold leading-tight">{t.title}</div>
                    {height >= 44 && <div className="truncate text-[11px]">{clock12(slot.start!)} – {clock12(slot.end!)} · not finished{t.planned ? ` · moved to ${shortDay(t.planned)}` : ""}</div>}
                  </div>
                </div>
              );
            })}

            {timed.map((t) => {
              const { lane, lanes: n } = lanes.get(t.id) ?? { lane: 0, lanes: 1 };
              const top = ((toMin(t.start!) - startH * 60) / 60) * HOUR_PX;
              const height = Math.max(24, (plannedMin(t) / 60) * HOUR_PX - 2);
              const c = tone(t, today);
              const done = t.status === "done";
              // as many notes (max 2) as fit under the title and time line
              const noteLines = Math.max(0, Math.min(2, t.notes?.length ?? 0, Math.floor((height - 8 - 20 - (height >= 44 ? 16 : 0)) / 18)));
              return (
                <div key={t.id} {...dragProps(t.id)} className={`absolute cursor-pointer overflow-hidden rounded-lg border text-left shadow-sm transition hover:shadow-md ${c.box}`}
                  style={{ top, height, left: `calc(${(lane / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` }} onClick={() => onEdit(t)}>
                  <span className={`absolute inset-y-0 left-0 w-1 ${c.bar}`} />
                  <div className="flex h-full items-start gap-2 py-1 pl-3 pr-2">
                    <input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer accent-emerald-600" checked={done} onClick={(e) => e.stopPropagation()} onChange={() => onToggle(t)} aria-label={`Mark “${t.title}” ${done ? "not done" : "done"}`} />
                    <button className="min-w-0 flex-1 cursor-pointer text-left" onClick={(e) => { e.stopPropagation(); onEdit(t); }} aria-label={`Edit ${t.title}`}>
                      <div className={`truncate text-sm font-semibold leading-tight ${done ? "line-through opacity-70" : ""}`}>{t.revision && <Repeat size={12} className="mr-1 inline" aria-label="Revision" />}{t.title}</div>
                      {overdueDay(t, today) && <span className="mr-1 rounded bg-rose-100 px-1 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">Overdue day {overdueDay(t, today)}</span>}
                      {height >= 44 && <div className="truncate text-[11px] opacity-75">{clock12(t.start!)} – {clock12(t.end!)}{!!t.subjects?.length && ` · ${t.subjects.join(", ")}`}{!!t.timeMin && ` · ⏱ ${fmtDur(t.timeMin)}`}</div>}
                      {noteLines > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {t.notes!.slice(0, noteLines).map((n) => <div key={n.id} className="truncate border-l-2 border-current/50 pl-1.5 text-[13px] font-medium leading-[17px]" title={n.text}>{n.text}</div>)}
                          {t.notes!.length > noteLines && <div className="pl-2 text-[11px] opacity-70">+{t.notes!.length - noteLines} more</div>}
                        </div>
                      )}
                    </button>
                    <NotesButton task={t} className="!size-6" />
                    <PlayButton task={t} className="!size-6" />
                  </div>
                </div>
              );
            })}

            {!timed.length && (
              <div className="pointer-events-none absolute inset-x-0 top-24 text-center text-sm text-slate-400">
                <CalendarDays className="mx-auto mb-2" size={28} />
                {past ? "Nothing was scheduled for this day." : "Nothing scheduled — click a slot or use New task."}
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card">
          <div className="card-title flex items-center justify-between">{past ? "Day recap" : isToday ? "Today’s progress" : "Plan summary"}
            {stats.completion !== null && <span className="text-xs font-normal tabular-nums text-slate-500">{Math.round(stats.completion * 100)}%</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round((stats.completion ?? 0) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Tasks completed">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(stats.completion ?? 0) * 100}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["Tasks done", `${stats.done}/${stats.tasks.length}`],
              ["Time planned", `${fmtDur(stats.doneMin)} / ${fmtDur(stats.plannedMin)}`],
              ["Focused", fmtDur(stats.focusMin)],
              ["On tasks · extra", `${fmtDur(stats.taskFocusMin)} · ${fmtDur(stats.extraFocusMin)}`],
            ].map(([k, v]) => (
              <div key={k} className="stat !px-3 !py-2"><dt className="text-[11px] text-slate-500">{k}</dt><dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{v}</dd></div>
            ))}
          </dl>
          {(stats.mistakes > 0 || mocks.length > 0) && (
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              {mocks.map((m) => <div key={m.id}>🏆 {m.name}: {m.score}/{m.maxScore}</div>)}
              {stats.mistakes > 0 && <div>📝 {stats.mistakes} mistake{stats.mistakes > 1 ? "s" : ""} logged</div>}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title flex items-center gap-1.5"><Inbox size={14} />Keep in todo · {backlog.length}</div>
          {backlog.length ? backlog.slice(0, 6).map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-1.5 text-sm" {...dragProps(t.id)}>
              <button className="min-w-0 flex-1 cursor-pointer truncate text-left text-slate-800 dark:text-slate-100" title={t.title} onClick={() => onEdit(t)}>{t.title}</button>
              <NotesButton task={t} className="!size-6" />
              {!past && <button className="chip cursor-pointer border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10" onClick={() => reschedule(t.id, date)} aria-label={`Schedule “${t.title}” on ${shortDay(date)}`}>{isToday ? "Today" : shortDay(date)}</button>}
            </div>
          )) : <div className="py-2 text-sm text-slate-400">Nothing waiting. Use “Keep in todo” when adding a task you haven’t placed yet.</div>}
          {backlog.length > 6 && <div className="text-xs text-slate-400">+{backlog.length - 6} more — see the Board view</div>}
        </div>

        <div className="card">
          <div className="card-title flex items-center gap-1.5"><Clock size={14} />Session log</div>
          {sessions.length ? sessions.slice(0, 8).map((p) => {
            const name = taskName(p.taskId);
            return (
              <div key={p.id} className="flex items-center gap-2 py-1 text-sm">
                <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{fmtDur(p.minutes)}</span>
                <span className="min-w-0 flex-1 truncate">{name ?? p.label ?? "Extra study"}</span>
                {!p.taskId && <span className="chip bg-slate-100 text-slate-500 dark:bg-white/10">extra</span>}
              </div>
            );
          }) : <div className="py-2 text-sm text-slate-400">No focus sessions {isToday ? "yet — start one from the Dashboard" : "this day"}.</div>}
        </div>

      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Week                                                                */
/* ------------------------------------------------------------------ */

type WeekProps = { stats: DayStats[]; today: string; onOpen: (d: string) => void; onToggle: (t: TodoItem) => void; onEdit: (t: TodoItem) => void; onNew: (d: string) => void; onMove: (id: string, d: string) => void };

function WeekView({ stats, today, onOpen, onToggle, onEdit, onNew, onMove }: WeekProps) {
  const { state } = useStore();
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {stats.map((s) => {
        const isToday = s.date === today;
        const items = [...s.tasks].sort((a, b) => (a.planned === s.date ? a.start ?? "99" : "00").localeCompare(b.planned === s.date ? b.start ?? "99" : "00"));
        return (
          <section key={s.date} aria-label={longDay(s.date)} {...dropProps((id) => onMove(id, s.date))}
            className={`flex min-h-48 flex-col rounded-2xl border bg-white p-2.5 dark:bg-[#111522] ${isToday ? "border-brand-500/60 ring-2 ring-brand-500/15" : "border-slate-200/80 dark:border-white/[.07]"}`}>
            <div className="mb-2 flex items-start justify-between gap-1">
              <button className="cursor-pointer text-left" onClick={() => onOpen(s.date)} aria-label={`Open ${longDay(s.date)}`}>
                <div className={`text-[11px] font-semibold uppercase tracking-wider ${isToday ? "text-brand-600" : "text-slate-400"}`}>{weekday(s.date)}</div>
                <div className={`text-xl font-bold leading-none ${isToday ? "text-brand-600" : "text-slate-900 dark:text-white"}`}>{Number(s.date.slice(8))}</div>
              </button>
              <button className="icon-btn !size-6 hover:!text-brand-600" aria-label={`Add task on ${longDay(s.date)}`} onClick={() => onNew(s.date)}><Plus size={14} /></button>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" aria-hidden>
              <div className={`h-full rounded-full ${s.date < today && (s.completion ?? 1) < 1 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${(s.completion ?? 0) * 100}%` }} />
            </div>
            <div className="mb-2 text-[11px] tabular-nums text-slate-500">{s.tasks.length ? `${s.done}/${s.tasks.length} done${s.plannedMin ? ` · ${fmtDur(s.plannedMin)}` : ""}` : "Free day"}</div>
            <div className="flex-1 space-y-1.5">
              {items.map((t) => {
                const c = tone(t, today);
                const own = t.planned === s.date;
                return (
                  <div key={t.id} {...dragProps(t.id)} className={`flex cursor-grab items-start gap-1.5 rounded-lg border px-1.5 py-1 text-xs ${c.box} ${own ? "" : "border-dashed"}`}>
                    <input type="checkbox" className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-emerald-600" checked={t.status === "done"} onChange={() => onToggle(t)} aria-label={`Mark “${t.title}” ${t.status === "done" ? "not done" : "done"}`} />
                    <button className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => onEdit(t)}>
                      <div className={`truncate font-medium ${t.status === "done" ? "line-through opacity-70" : ""}`}>{t.revision && <Repeat size={10} className="mr-1 inline" aria-label="Revision" />}{t.title}</div>
                      <div className="text-[10px] opacity-70">{own && t.start ? clock12(t.start) : own ? "all day" : dayCounter(t, s.date) ?? "carried over"}</div>
                    </button>
                    <NotesButton task={t} className="!size-5" />
                    {s.date === today && <PlayButton task={t} className="!size-5" />}
                  </div>
                );
              })}
              {missedOn(state, s.date).map(({ task: t, slot }) => (
                <button key={`ghost-${t.id}`} onClick={() => onEdit(t)} className="block w-full cursor-pointer rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-1.5 py-1 text-left text-xs text-amber-900/70 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-100/70">
                  <div className="truncate font-medium">{t.title}</div>
                  <div className="text-[10px]">{slot.start ? `${clock12(slot.start)} · ` : ""}not finished · moved on</div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Month                                                               */
/* ------------------------------------------------------------------ */

function MonthView({ stats, month, today, onOpen, onEdit, onMove }: { stats: DayStats[]; month: string; today: string; onOpen: (d: string) => void; onEdit: (t: TodoItem) => void; onMove: (id: string, d: string) => void }) {
  const { state } = useStore();
  const grid = monthDates(`${month}-01`);
  const byDate = new Map(stats.map((s) => [s.date, s]));
  return (
    <div className="card !p-2 sm:!p-3">
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400" aria-hidden>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-slate-200 dark:bg-white/[.08]">
        {grid.map((d) => {
          const inMonth = d.slice(0, 7) === month;
          const s = byDate.get(d) ?? dayStats(state, d, today);
          const isToday = d === today;
          const full = s.completion === 1;
          const missed = d < today && s.completion !== null && s.completion < 1;
          const items = [...s.tasks].sort((a, b) => (a.start ?? "99").localeCompare(b.start ?? "99"));
          return (
            <div key={d} role="button" tabIndex={0} onClick={() => onOpen(d)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(d))} {...dropProps((id) => onMove(id, d))}
              aria-label={`${longDay(d)}: ${s.tasks.length ? `${s.done} of ${s.tasks.length} tasks done` : "no tasks"}`}
              className={`flex min-h-[72px] cursor-pointer flex-col gap-1 bg-white p-1.5 text-left transition hover:bg-brand-50 sm:min-h-28 dark:bg-[#111522] dark:hover:bg-white/[.04] ${inMonth ? "" : "opacity-40"}`}>
              <div className="flex items-center justify-between">
                <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${isToday ? "bg-brand-500 text-white" : "text-slate-700 dark:text-slate-300"}`}>{Number(d.slice(8))}</span>
                {full ? <Check size={14} className="text-emerald-500" aria-hidden /> : missed ? <span className="size-2 rounded-full bg-amber-500" aria-hidden /> : null}
              </div>
              <div className="hidden min-w-0 flex-1 space-y-0.5 sm:block">
                {items.slice(0, 3).map((t) => {
                  const c = tone(t, today);
                  return <div key={t.id} {...dragProps(t.id)} onClick={(e) => { e.stopPropagation(); onEdit(t); }} className={`cursor-grab truncate rounded border-l-2 px-1 text-[10px] leading-4 ${c.box} ${c.bar.replace("bg-", "border-l-")} ${t.status === "done" ? "line-through opacity-70" : ""}`}>{t.title}</div>;
                })}
                {items.length > 3 && <div className="px-1 text-[10px] text-slate-400">+{items.length - 3} more</div>}
              </div>
              {s.tasks.length > 0 && (
                <div className="mt-auto h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" aria-hidden>
                  <div className={`h-full rounded-full ${missed ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${(s.completion ?? 0) * 100}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 px-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Check size={12} className="text-emerald-500" />all tasks done</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-500" />unfinished</span>
        <span>Click a day to open it · drag a task onto another day to move it</span>
      </div>
    </div>
  );
}

/** Unscheduled tasks, ready to be dragged onto a day. */
function BacklogTray({ tasks, onEdit }: { tasks: TodoItem[]; onEdit: (t: TodoItem) => void }) {
  if (!tasks.length) return null;
  return (
    <div className="card mt-4">
      <div className="card-title flex items-center gap-1.5"><Inbox size={14} />Keep in todo · {tasks.length} <span className="text-xs font-normal text-slate-400">drag onto a day to schedule</span></div>
      <div className="flex flex-wrap gap-2">
        {tasks.map((t) => (
          <button key={t.id} {...dragProps(t.id)} onClick={() => onEdit(t)} className="max-w-xs cursor-grab truncate rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-200">{t.title}</button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress over the visible period                                    */
/* ------------------------------------------------------------------ */

function RangeSummary({ stats, tasks, today, range, chart }: { stats: DayStats[]; tasks: TodoItem[]; today: string; range: Range; chart: boolean }) {
  const sum = (f: (s: DayStats) => number) => stats.reduce((a, s) => a + f(s), 0);
  const done = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter((t) => phaseOf(t, today) === "overdue").length;
  const planned = sum((s) => s.plannedMin);
  const doneMin = sum((s) => s.doneMin);
  const focus = sum((s) => s.focusMin);
  const taskFocus = sum((s) => s.taskFocusMin);
  const active = stats.filter((s) => s.done > 0 || s.focusMin > 0).length;
  const best = [...stats].filter((s) => s.date <= today).sort((a, b) => b.doneMin + b.focusMin - (a.doneMin + a.focusMin))[0];
  const label = range === "day" ? "day" : range;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
  const bestVal = best ? best.doneMin + best.focusMin : 0;

  const cards: [string, string, string][] = [
    ["Tasks done", `${done}/${tasks.length}`, tasks.length ? `${pct(done, tasks.length)} complete` : "nothing scheduled"],
    ["Planned time", fmtDur(planned), `${fmtDur(doneMin)} completed`],
    ["Focus time", fmtDur(focus), `${fmtDur(taskFocus)} on tasks · ${fmtDur(focus - taskFocus)} extra`],
    ["Overdue", String(overdue), overdue ? "needs a new day" : "all on track"],
    ["Active days", String(active), `of ${stats.length}`],
    ["Best day", bestVal > 0 ? shortDay(best.date) : "–", bestVal > 0 ? fmtDur(bestVal) : "no activity yet"],
  ];
  const data = stats.map((s) => ({ day: range === "week" ? weekday(s.date) : String(Number(s.date.slice(8))), Completed: +(s.doneMin / 60).toFixed(2), Remaining: +((s.plannedMin - s.doneMin) / 60).toFixed(2), Focus: +(s.focusMin / 60).toFixed(2) }));

  return (
    <div className={`mt-5 grid items-start gap-5 ${chart ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" : ""}`}>
      <div className={`grid grid-cols-2 gap-3 ${chart ? "sm:grid-cols-3" : "sm:grid-cols-3 lg:grid-cols-6"}`}>
        {cards.map(([k, v, sub]) => (
          <div key={k} className="stat"><div className="text-[11px] text-slate-500">{k}</div><div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{v}</div><div className="text-[11px] text-slate-400">{sub}</div></div>
        ))}
      </div>
      {chart && (
        <div className="card">
          <div className="card-title">Planned vs completed vs focused (hours)</div>
          {planned + focus > 0 ? (
            <div className="h-52" role="img" aria-label={`Hours planned, completed and focused per day this ${label}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid vertical={false} strokeOpacity={0.15} />
                  <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} interval={range === "month" ? 1 : 0} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} width={24} />
                  <Tooltip cursor={{ fill: "rgba(99,102,241,.08)" }} formatter={(v) => `${v}h`} />
                  <Bar dataKey="Completed" stackId="a" fill="#10b981" />
                  <Bar dataKey="Remaining" stackId="a" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Focus" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty icon={<Target size={28} />} text={`No timed tasks or focus time this ${label} yet`} />}
        </div>
      )}
    </div>
  );
}
