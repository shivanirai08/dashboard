import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { addDays, daysUntil, formatDate, todayISO } from "../lib/dates";
import { Empty, PageHeader } from "../components/ui";
import SubjectPicker from "../components/SubjectPicker";
import PlayButton from "../components/PlayButton";
import { useRemove } from "../lib/undo";
import { useTasks } from "../lib/useTasks";
import { uid } from "../lib/ids";
import { subjectTone } from "../lib/subjects";
import type { TodoItem } from "../lib/types";

/** Revision topics are tasks: they sit on the Schedule on their due day, and finishing one books the next. */
export default function Revisions() {
  const { state, catalog } = useStore();
  const remove = useRemove();
  const { create, review, update } = useTasks();
  const today = todayISO();
  const [topic, setTopic] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const add = () => {
    if (!topic.trim()) return;
    create({
      title: topic.trim(), subjects: subjects.length ? subjects : undefined, planned: addDays(today, 1),
      revision: { key: uid(), intervalDays: 1, lastReviewed: today, notes: notes.trim() || undefined },
    }, { untimed: true });
    setTopic("");
    setNotes("");
  };

  const open = state.todos.filter((t) => t.revision && t.status !== "done").sort((a, b) => (a.planned ?? "").localeCompare(b.planned ?? ""));
  const due = open.filter((t) => daysUntil(t.planned ?? today) <= 0);
  const later = open.filter((t) => daysUntil(t.planned ?? today) > 0);
  const reviewedToday = state.todos.filter((t) => t.revision && t.status === "done" && t.doneAt === today).length;

  const Row = ({ t }: { t: TodoItem }) => {
    const d = daysUntil(t.planned ?? today);
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 py-3 last:border-0 dark:border-white/5">
        <div className="min-w-[12rem] flex-1 basis-full sm:basis-48">
          <div className="font-medium text-slate-900 dark:text-white">{t.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {t.subjects?.map((s) => <span key={s} className={`chip !py-0 ${subjectTone(s)}`}>{s}</span>)}
            {t.revision?.notes && <span className="text-xs text-slate-500">{t.revision.notes}</span>}
          </div>
        </div>
        <span className={`chip ${d < 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : d === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
          {d < 0 ? `${-d}d overdue` : d === 0 ? "due today" : formatDate(t.planned!)}
        </span>
        <span className="text-xs text-slate-400">every {t.revision?.intervalDays}d</span>
        {d <= 0 && <PlayButton task={t} />}
        <button className="btn !py-1.5" onClick={() => review(t.id, true)}>Revised</button>
        <button className="btn-ghost !py-1.5" onClick={() => review(t.id, false)}>Forgot</button>
        <input type="date" aria-label={`Reschedule ${t.title}`} className="input !w-auto !px-2 !py-1 !text-xs" min={today} value={t.planned ?? ""} onChange={(e) => e.target.value && update(t.id, { planned: e.target.value }, { untimed: true })} />
        <button className="icon-btn" aria-label={`Delete ${t.title}`} onClick={() => remove("todos", t.id, "Revision")}><Trash2 size={15} /></button>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Revision" sub="Spaced repetition: 1 → 3 → 7 → 14 → 30 → 60 days. Forgetting resets to 1 day. Every revision also appears on your Schedule on its due day.">
        <Link to="/schedule" className="btn-ghost"><CalendarDays size={15} />Open schedule</Link>
      </PageHeader>
      <div className="card">
        <div className="grid gap-3 sm:grid-cols-7">
          <div className="sm:col-span-3"><span className="label">Topic just studied</span><input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="e.g. Deadlock avoidance" /></div>
          <div className="sm:col-span-2"><span className="label">Subjects</span><SubjectPicker value={subjects} onChange={setSubjects} options={catalog.subjects} /></div>
          <div className="sm:col-span-1"><span className="label">Notes</span><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} /></div>
          <div className="flex items-end"><button className="btn w-full" onClick={add}>Add</button></div>
        </div>
      </div>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        <div className="card">
          <div className="card-title flex items-center justify-between">Due now · {due.length}{reviewedToday > 0 && <span className="text-xs font-normal text-emerald-600">{reviewedToday} revised today</span>}</div>
          {due.length ? due.map((t) => <Row key={t.id} t={t} />) : <Empty icon={<CheckCircle2 size={28} />} text="All caught up 🎉" />}
        </div>
        <div className="card">
          <div className="card-title">Upcoming · {later.length}</div>
          {later.length ? later.map((t) => <Row key={t.id} t={t} />) : <Empty icon={<RotateCcw size={28} />} text={open.length ? "Nothing scheduled" : "Add a topic after you study it"} />}
        </div>
      </div>
    </>
  );
}
