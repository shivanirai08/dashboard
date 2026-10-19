import { useState } from "react";
import { CalendarClock, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { Repeat } from "lucide-react";
import { subjectTone } from "../lib/subjects";
import { useToast } from "./Toast";
import PlayButton from "./PlayButton";
import { NotesButton } from "./TaskNotes";
import { useTasks } from "../lib/useTasks";
import { addDays, daysUntil, formatDate, todayISO } from "../lib/dates";
import { clock12, fmtDur } from "../lib/schedule";
import { columnOf, dayCounter, overdueDay, phaseOf, plannedMin, type Column } from "../lib/tasks";
import type { Priority, TodoItem } from "../lib/types";

export const DRAG_TASK = "application/x-task-id";

const COLS: { key: Column; label: string; hint: string; dot: string }[] = [
  { key: "backlog", label: "Keep in todo", hint: "No day decided yet", dot: "bg-slate-400" },
  { key: "todo", label: "Scheduled", hint: "Starts later", dot: "bg-sky-500" },
  { key: "doing", label: "In progress", hint: "Started, not finished", dot: "bg-indigo-500" },
  { key: "done", label: "Done", hint: "", dot: "bg-emerald-500" },
];
const PRIO: Record<Priority, string> = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  med: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  low: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};
const PRIO_LABEL: Record<Priority, string> = { high: "High", med: "Med", low: "Low" };

const sortKey = (t: TodoItem) => `${t.planned ?? t.due ?? "9999"} ${t.start ?? "99:99"}`;

type Props = { tasks: TodoItem[]; onEdit: (t: TodoItem) => void; onDelete: (t: TodoItem) => void };

/** Kanban over the same tasks the calendar shows. Drag a card (or use its status menu) to change it. */
export default function TaskBoard({ tasks, onEdit, onDelete }: Props) {
  const { state } = useStore();
  const toast = useToast();
  const { moveTo, toggleDone, reschedule, review, putBack } = useTasks();
  const today = todayISO();
  const [over, setOver] = useState<Column | null>(null);

  const move = (t: TodoItem, col: Column) => {
    if (columnOf(t, today) === col) return;
    const note = moveTo(t, col);
    if (note) toast(`“${t.title}” — ${note.toLowerCase()}`);
  };

  const byCol = (c: Column) => tasks.filter((t) => columnOf(t, today) === c).sort((a, b) => (c === "done" ? (b.doneAt ?? "").localeCompare(a.doneAt ?? "") : sortKey(a).localeCompare(sortKey(b))));

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {COLS.map((col) => {
        const list = byCol(col.key);
        return (
          <section key={col.key} aria-label={col.label}
            onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_TASK)) { e.preventDefault(); setOver(col.key); } }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const t = state.todos.find((x) => x.id === e.dataTransfer.getData(DRAG_TASK));
              if (t) move(t, col.key);
            }}
            className={`rounded-2xl p-3 transition ${over === col.key ? "bg-brand-50 ring-2 ring-brand-500/40 dark:bg-brand-500/10" : "bg-slate-200/50 dark:bg-white/[.03]"}`}>
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span className={`size-2 rounded-full ${col.dot}`} />{col.label}
              <span className="ml-auto text-xs font-normal text-slate-400">{list.length}</span>
            </div>
            <div className="min-h-24 space-y-2.5">
              {list.map((t) => {
                const phase = phaseOf(t, today);
                const done = t.status === "done";
                const counter = dayCounter(t, today);
                const est = plannedMin(t);
                const when = t.planned ? `${daysUntil(t.planned) === 0 ? "Today" : daysUntil(t.planned) === 1 ? "Tomorrow" : formatDate(t.planned)}${t.start ? ` · ${clock12(t.start)}` : ""}` : null;
                return (
                  <article key={t.id} draggable onDragStart={(e) => { e.dataTransfer.setData(DRAG_TASK, t.id); e.dataTransfer.effectAllowed = "move"; }}
                    className="card cursor-grab !p-3 active:cursor-grabbing">
                    <div className="flex items-start gap-2">
                      <input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer accent-indigo-600" checked={done} onChange={() => toggleDone(t)} aria-label={`Mark “${t.title}” ${done ? "not done" : "done"}`} />
                      <button className={`min-w-0 flex-1 cursor-pointer text-left text-sm font-medium ${done ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`} onClick={() => onEdit(t)}>{t.title}</button>
                      <NotesButton task={t} className="!size-6" />
                      <PlayButton task={t} className="!size-6" />
                      <button className="icon-btn !size-6 shrink-0" aria-label={`Delete “${t.title}”`} onClick={() => onDelete(t)}><Trash2 size={13} /></button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`chip ${PRIO[t.priority ?? "med"]}`}>{PRIO_LABEL[t.priority ?? "med"]}</span>
                      {t.subjects?.map((x) => <span key={x} className={`chip ${subjectTone(x)}`}>{x}</span>)}
                      {t.revision && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Repeat size={11} className="mr-1" />every {t.revision.intervalDays}d</span>}
                      {phase === "overdue" && !overdueDay(t, today) && <span className="chip bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{-daysUntil(t.due ?? t.planned ?? today)}d overdue</span>}
                      {overdueDay(t, today) && <span className="chip bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">Overdue day {overdueDay(t, today)}</span>}
                      {counter && <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{counter}</span>}
                    </div>
                    {(when || t.due) && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarClock size={12} aria-hidden />{when}{t.due && t.due !== t.planned && <span className="text-slate-400">· due {formatDate(t.due)}</span>}
                      </div>
                    )}
                    {(est > 0 || !!t.timeMin) && (
                      <div className="mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500"><Clock size={12} aria-hidden />{fmtDur(t.timeMin ?? 0)} focused{est > 0 && <span className="text-slate-400">of {fmtDur(est)}</span>}</div>
                        {est > 0 && <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" aria-hidden><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, ((t.timeMin ?? 0) / est) * 100)}%` }} /></div>}
                      </div>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {col.key === "backlog" && (
                        <>
                          <button className="chip cursor-pointer border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10" onClick={() => reschedule(t.id, today)}>Today</button>
                          <button className="chip cursor-pointer border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10" onClick={() => reschedule(t.id, addDays(today, 1))}>Tomorrow</button>
                        </>
                      )}
                      {t.revision && !done && (
                        <>
                          <button className="chip cursor-pointer bg-emerald-100 text-emerald-700 hover:brightness-95 dark:bg-emerald-500/15 dark:text-emerald-300" onClick={() => review(t.id, true)}>Revised</button>
                          <button className="chip cursor-pointer border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10" onClick={() => review(t.id, false)}>Forgot</button>
                        </>
                      )}
                      {!done && !!t.missed?.length && <button className="chip cursor-pointer border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10" title="Put it back on the day it was missed" onClick={() => { const d = putBack(t.id); if (d) toast(`“${t.title}” put back on ${formatDate(d)}`); }}>Remove from today</button>}
                      {phase === "overdue" && <button className="chip cursor-pointer border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10" onClick={() => reschedule(t.id, today)}>Move to today</button>}
                      <select aria-label={`Status of “${t.title}”`} className="ml-auto cursor-pointer rounded-md border border-slate-200 bg-transparent px-1.5 py-0.5 text-xs text-slate-500 dark:border-white/10" value={col.key} onChange={(e) => move(t, e.target.value as Column)}>
                        {COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                  </article>
                );
              })}
              {!list.length && (
                <div className="py-6 text-center text-xs text-slate-400">
                  {col.key === "done" ? <><CheckCircle2 className="mx-auto mb-1" size={18} />Nothing finished in this period</> : col.hint || "Empty"}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
