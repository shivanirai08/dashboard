import { useState } from "react";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { uid } from "../lib/ids";
import { addDays, daysUntil, formatDate, todayISO } from "../lib/dates";
import { Empty, Field, PageHeader } from "../components/ui";

// spaced repetition: each successful review pushes the next one further out
const next = (d: number) => (d < 1 ? 1 : d < 3 ? 3 : d < 7 ? 7 : d < 14 ? 14 : d < 30 ? 30 : 60);

export default function Revisions() {
  const { state, catalog, setState } = useStore();
  const [f, setF] = useState({ subject: catalog.subjects[0], topic: "", notes: "" });

  const add = () => {
    if (!f.topic) return;
    setState((p) => ({ ...p, revisions: [...p.revisions, { id: uid(), ...f, lastReviewed: todayISO(), nextDue: addDays(todayISO(), 1), intervalDays: 1 }] }));
    setF({ ...f, topic: "", notes: "" });
  };
  const review = (id: string, ok: boolean) =>
    setState((p) => ({
      ...p,
      revisions: p.revisions.map((r) => {
        if (r.id !== id) return r;
        const interval = ok ? next(r.intervalDays) : 1;
        return { ...r, lastReviewed: todayISO(), intervalDays: interval, nextDue: addDays(todayISO(), interval) };
      }),
    }));

  const rows = [...state.revisions].sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const due = rows.filter((r) => daysUntil(r.nextDue) <= 0);
  const later = rows.filter((r) => daysUntil(r.nextDue) > 0);

  const Row = ({ r }: { r: (typeof rows)[number] }) => {
    const d = daysUntil(r.nextDue);
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-white/5">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900 dark:text-white">{r.topic}</div>
          <div className="text-xs text-slate-500">{r.subject}{r.notes && ` · ${r.notes}`}</div>
        </div>
        <span className={`chip ${d < 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : d === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
          {d < 0 ? `${-d}d overdue` : d === 0 ? "due today" : formatDate(r.nextDue)}
        </span>
        <span className="text-xs text-slate-400">every {r.intervalDays}d</span>
        <button className="btn !py-1.5" onClick={() => review(r.id, true)}>Revised</button>
        <button className="btn-ghost !py-1.5" onClick={() => review(r.id, false)}>Forgot</button>
        <button className="icon-btn" aria-label="Delete" onClick={() => setState((p) => ({ ...p, revisions: p.revisions.filter((x) => x.id !== r.id) }))}><Trash2 size={15} /></button>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Revision" sub="Spaced repetition: 1 → 3 → 7 → 14 → 30 → 60 days. Forgetting resets to 1 day." />
      <div className="card">
        <div className="grid gap-3 sm:grid-cols-7">
          <Field label="Subject" className="sm:col-span-2"><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>{catalog.subjects.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Topic just studied" className="sm:col-span-2"><input className="input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add()} /></Field>
          <Field label="Notes" className="sm:col-span-2"><input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <div className="flex items-end"><button className="btn w-full" onClick={add}>Add</button></div>
        </div>
      </div>
      <div className="card mt-4">
        <div className="card-title">Due now · {due.length}</div>
        {due.length ? due.map((r) => <Row key={r.id} r={r} />) : <Empty icon={<CheckCircle2 size={28} />} text="All caught up 🎉" />}
      </div>
      {later.length > 0 && (
        <div className="card mt-4">
          <div className="card-title">Upcoming · {later.length}</div>
          {later.map((r) => <Row key={r.id} r={r} />)}
        </div>
      )}
      {!rows.length && <div className="card mt-4"><Empty icon={<RotateCcw size={28} />} text="Add a topic after you study it" /></div>}
    </>
  );
}
