import { useEffect, useRef, useState } from "react";
import { CalendarClock, Inbox, ListTodo, Repeat, Trash2, X } from "lucide-react";
import { useStore } from "../lib/store";
import { addDays, todayISO } from "../lib/dates";
import { uid } from "../lib/ids";
import { useTasks } from "../lib/useTasks";
import { fmtDur, fromMin, nowHM, toMin } from "../lib/schedule";
import { dailyContribution, missPatch } from "../lib/tasks";
import { formatDate } from "../lib/dates";
import { Field, HoursInput } from "./ui";
import SubjectPicker from "./SubjectPicker";
import type { Priority, TodoItem, TodoStatus } from "../lib/types";

export type TaskDraft = Partial<TodoItem> & { title?: string };

/**
 * The one place tasks are created or edited.
 *   Schedule     → on that date at the given time (current time if left empty)
 *   Keep in todo → no date yet; it waits in the backlog
 *   Revision     → a task that repeats on a spaced schedule (1 → 3 → 7 → 14 → 30 → 60 days)
 */
export default function TaskDialog({ draft, onClose, onDelete }: { draft: TaskDraft; onClose: () => void; onDelete: (t: TodoItem) => void }) {
  const { catalog, state } = useStore();
  const { create, update, setStatus: setTaskStatus } = useTasks();
  const isNew = !draft.id;
  const [title, setTitle] = useState(draft.title ?? "");
  const [subjects, setSubjects] = useState<string[]>(draft.subjects ?? []);
  const [isRev, setIsRev] = useState(!!draft.revision);
  const [interval, setInterval] = useState(draft.revision?.intervalDays ?? 1);
  const [revNotes, setRevNotes] = useState(draft.revision?.notes ?? "");
  const [priority, setPriority] = useState<Priority>(draft.priority ?? "med");
  const [scheduled, setScheduled] = useState(isNew ? draft.planned !== undefined || !("planned" in draft) : !!draft.planned);
  const [date, setDate] = useState(draft.planned ?? (isNew && !("planned" in draft) ? todayISO() : ""));
  const [start, setStart] = useState(draft.start ?? "");
  const [end, setEnd] = useState(draft.end ?? "");
  const [due, setDue] = useState(draft.due ?? "");
  const [showDue, setShowDue] = useState(!!draft.due);
  const [status, setStatus] = useState<TodoStatus>(draft.status ?? "todo");
  const [logged, setLogged] = useState<number | undefined>(draft.timeMin ?? 0);
  const [err, setErr] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return setErr("Give the task a title.");
    if (scheduled && !date) return setErr("Pick a date, or choose “Keep in todo”.");
    if (scheduled && start && end && toMin(end) <= toMin(start)) return setErr("End time must be after the start time.");
    // with "Lock past days" on, nothing new may land on a day that has gone (staying on its own old day is fine)
    if (state.lockPastDays && scheduled && date < todayISO() && date !== draft.planned) return setErr("Past days are locked (Settings). Pick today or a later date.");
    if (scheduled && showDue && due && due < date) return setErr("The deadline can’t be before the date.");
    const fields: Partial<TodoItem> = {
      title: title.trim(),
      subjects: subjects.length ? subjects : undefined,
      priority,
      planned: scheduled ? date : undefined,
      start: scheduled ? start || undefined : undefined,
      end: scheduled ? (start ? end || undefined : undefined) : undefined,
      due: scheduled && showDue && due ? due : undefined,
    };
    fields.revision = isRev ? { key: draft.revision?.key || uid(), intervalDays: interval, lastReviewed: draft.revision?.lastReviewed ?? todayISO(), notes: revNotes.trim() || undefined } : undefined;
    if (isRev) fields.due = undefined;
    const untimed = isRev && !start;
    if (isNew) create({ title: fields.title!, ...fields, status }, { untimed });
    else {
      // finishing a revision goes through the spaced-repetition path so the next one gets scheduled
      const finishing = !!draft.revision && isRev && status === "done" && draft.status !== "done";
      update(draft.id!, { ...fields, ...(date && scheduled ? missPatch(draft as TodoItem, date) : undefined), status: finishing ? draft.status : status, timeMin: logged ?? 0 }, { untimed });
      if (finishing) setTaskStatus(draft.id!, "done");
    }
    onClose();
  };

  const pickStart = (v: string) => {
    setStart(v);
    setErr("");
    // keep the length when the start moves
    if (v && start && end) setEnd(fromMin(toMin(v) + (toMin(end) - toMin(start))));
  };

  const seg = (on: boolean) => `flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm transition ${on ? "bg-brand-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`;
  const segWrap = "grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[.03]";
  const rows = isNew ? [] : dailyContribution(state, draft as TodoItem);
  const total = rows.reduce((a, r) => a + r.min, 0);

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-slate-900/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="task-dialog-title" onSubmit={submit} className="card flex max-h-[92vh] w-full max-w-lg flex-col !rounded-b-none !p-0 shadow-2xl sm:!rounded-b-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-white/[.06]">
          <h2 id="task-dialog-title" className="text-base font-semibold text-slate-900 dark:text-white">{isNew ? (isRev ? "New revision" : "New task") : isRev ? "Edit revision" : "Edit task"}</h2>
          <button type="button" className="icon-btn hover:!text-slate-700" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div role="radiogroup" aria-label="Type" className={segWrap}>
            {([[false, "Task", ListTodo], [true, "Revision", Repeat]] as const).map(([v, l, Icon]) => (
              <button key={l} type="button" role="radio" aria-checked={isRev === v}
                onClick={() => { setIsRev(v); setErr(""); if (v) { setScheduled(true); if (!date) setDate(addDays(todayISO(), 1)); } }}
                className={seg(isRev === v)}><Icon size={14} />{l}</button>
            ))}
          </div>

          <div className="space-y-3">
            <Field label={isRev ? "Topic" : "Title"}><input ref={titleRef} className="input" placeholder={isRev ? "e.g. Deadlock avoidance" : "e.g. OS – deadlocks + 10 PYQs"} value={title} onChange={(e) => { setTitle(e.target.value); setErr(""); }} /></Field>
            <div>
              <span className="label">Subjects</span>
              <SubjectPicker value={subjects} onChange={setSubjects} options={catalog.subjects} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority"><select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}><option value="high">High</option><option value="med">Medium</option><option value="low">Low</option></select></Field>
              {!isNew && <Field label="Status"><select className="input" value={status} onChange={(e) => setStatus(e.target.value as TodoStatus)}><option value="todo">To do</option><option value="doing">In progress</option><option value="done">Done</option></select></Field>}
            </div>
          </div>

          <section className="space-y-3 rounded-2xl border border-slate-200 p-3.5 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{isRev ? "First review" : "When"}</span>
              {!isRev && (
                <div role="radiogroup" aria-label="When" className={`${segWrap} !gap-0.5 !p-0.5`}>
                  {([[true, "Schedule", CalendarClock], [false, "Keep in todo", Inbox]] as const).map(([v, l, Icon]) => (
                    <button key={l} type="button" role="radio" aria-checked={scheduled === v}
                      onClick={() => { setScheduled(v); setErr(""); if (v && !date) setDate(draft.planned ?? todayISO()); }}
                      className={`${seg(scheduled === v)} px-3 !py-1 text-xs`}><Icon size={13} />{l}</button>
                  ))}
                </div>
              )}
            </div>
            {!scheduled && <p className="text-xs text-slate-400">Not decided yet — it waits in the backlog until you give it a day.</p>}

            {scheduled && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Date" className="col-span-3 sm:col-span-1"><input type="date" className="input" value={date} onChange={(e) => { setDate(e.target.value); setErr(""); }} /></Field>
                  <Field label="Start"><input type="time" className="input" step={300} value={start} onChange={(e) => pickStart(e.target.value)} /></Field>
                  <Field label="End"><input type="time" className="input" step={300} value={end} disabled={!start} onChange={(e) => { setEnd(e.target.value); setErr(""); }} /></Field>
                </div>
                <div className="flex flex-wrap items-center gap-1.5" aria-label="Duration presets">
                  <span className="text-xs text-slate-400">Length</span>
                  {[30, 60, 90, 120].map((m) => (
                    <button key={m} type="button" className="chip cursor-pointer border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
                      onClick={() => { const st = start || nowHM(); setStart(st); setEnd(fromMin(toMin(st) + m)); }}>{fmtDur(m)}</button>
                  ))}
                </div>
                {!start && <p className="text-xs text-slate-400">{isRev ? "All-day revision — add a start time to put it on the time grid." : `No start time? It’s placed at the current time (${nowHM()}) for an hour.`}</p>}
                {isRev ? null : showDue ? (
                  <Field label="Deadline (for tasks that take several days)">
                    <div className="flex gap-2">
                      <input type="date" className="input" min={date} value={due} onChange={(e) => { setDue(e.target.value); setErr(""); }} />
                      <button type="button" className="btn-ghost" onClick={() => { setShowDue(false); setDue(""); }}>Remove</button>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">In progress every day from the date until this deadline; overdue after.</p>
                  </Field>
                ) : (
                  <button type="button" className="cursor-pointer text-xs font-medium text-brand-600 hover:underline" onClick={() => setShowDue(true)}>+ Add a later deadline</button>
                )}
              </>
            )}
          </section>

          {isRev && (
            <section className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 p-3.5 dark:border-white/10">
              <Field label="Repeats every"><select className="input" value={interval} onChange={(e) => setInterval(Number(e.target.value))}>{[1, 3, 7, 14, 30, 60].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}</select></Field>
              <Field label="Notes"><input className="input" placeholder="what to recall" value={revNotes} onChange={(e) => setRevNotes(e.target.value)} /></Field>
              <p className="col-span-2 text-xs text-slate-400">Finishing it books the next review further out (1 → 3 → 7 → 14 → 30 → 60 days); “forgot” books it for tomorrow.</p>
            </section>
          )}

          {!isNew && (
            <section className="space-y-3 rounded-2xl border border-slate-200 p-3.5 dark:border-white/10">
              <div className="flex items-end justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Time</span>
                <Field label="Logged (hours.min)" className="w-36"><HoursInput minutes={logged} onChange={setLogged} /></Field>
              </div>
              {(rows.length > 1 || total > 0) && (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-white/[.06] dark:border-white/10" aria-label="Time by day">
                  {rows.map((r) => (
                    <li key={r.date} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="chip bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">Day {r.day}</span>
                      <span className="text-slate-500">{formatDate(r.date)}</span>
                      <span className={`ml-auto tabular-nums ${r.min ? "font-medium text-slate-900 dark:text-white" : "text-slate-400"}`}>{r.min ? fmtDur(r.min) : "–"}</span>
                    </li>
                  ))}
                  <li className="flex items-center px-3 py-1.5 text-xs font-semibold text-slate-500"><span>Total focused</span><span className="ml-auto tabular-nums">{fmtDur(total)}</span></li>
                </ul>
              )}
            </section>
          )}

          {err && <div role="alert" className="text-sm text-rose-600">{err}</div>}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 dark:border-white/[.06]">
          {!isNew && <button type="button" className="icon-btn !size-9 hover:!text-rose-600" aria-label="Delete task" title="Delete task" onClick={() => onDelete(draft as TodoItem)}><Trash2 size={16} /></button>}
          <button type="button" className="btn-ghost ml-auto" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">{isNew ? (isRev ? "Add revision" : "Add task") : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
