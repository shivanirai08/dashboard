import { useState } from "react";
import { BookmarkPlus, Check, Pencil, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import { useStore } from "../lib/store";
import { uid } from "../lib/ids";
import { addDays, formatDate, todayISO } from "../lib/dates";
import { Empty, Field, PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";
import { useRemove } from "../lib/undo";
import type { Mistake, MistakeKind } from "../lib/types";

const kinds: Record<MistakeKind, string> = {
  concept: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  calculation: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  misread: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  guess: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  time: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300",
};

export default function Mistakes() {
  const { state, catalog, setState } = useStore();
  const toast = useToast();
  const remove = useRemove();
  const blank = { subject: catalog.subjects[0], topic: "", kind: "concept" as MistakeKind, question: "", fix: "" };
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [kind, setKind] = useState<MistakeKind | "">("");
  const [subject, setSubject] = useState("");

  const save = () => {
    if (!f.question.trim()) return;
    if (editId) setState((p) => ({ ...p, mistakes: p.mistakes.map((m) => (m.id === editId ? { ...m, ...f } : m)) }));
    else {
      const m: Mistake = { id: uid(), date: todayISO(), ...f, resolved: false };
      setState((p) => ({ ...p, mistakes: [m, ...p.mistakes] }));
    }
    setEditId(null);
    setF({ ...blank, subject: f.subject });
  };
  const edit = (m: Mistake) => {
    setEditId(m.id);
    setF({ subject: m.subject, topic: m.topic, kind: m.kind, question: m.question, fix: m.fix });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const patch = (id: string, c: Partial<Mistake>) => setState((p) => ({ ...p, mistakes: p.mistakes.map((m) => (m.id === id ? { ...m, ...c } : m)) }));

  const toRevision = (m: Mistake) => {
    const topic = m.topic || m.question.slice(0, 60);
    if (state.revisions.some((r) => r.topic === topic && r.subject === m.subject)) return toast("Already in revision");
    setState((p) => ({ ...p, revisions: [...p.revisions, { id: uid(), subject: m.subject, topic, notes: m.fix, lastReviewed: todayISO(), nextDue: addDays(todayISO(), 1), intervalDays: 1 }] }));
    toast(`“${topic}” added to revision`);
  };

  const list = state.mistakes.filter((m) => (filter === "all" || (filter === "open") === !m.resolved) && (!kind || m.kind === kind) && (!subject || m.subject === subject));

  return (
    <>
      <PageHeader title="Mistake Log" sub="Every wrong answer is a free lesson. Log it, fix it, resolve it." />
      <div className={`card ${editId ? "ring-2 ring-brand-500" : ""}`}>
        <div className="grid gap-3 sm:grid-cols-6">
          <Field label="Subject" className="sm:col-span-2"><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>{catalog.subjects.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Topic" className="sm:col-span-2"><input className="input" placeholder="e.g. Paging" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></Field>
          <Field label="Mistake type" className="sm:col-span-2"><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as MistakeKind })}>{Object.keys(kinds).map((k) => <option key={k}>{k}</option>)}</select></Field>
          <Field label="What went wrong" className="sm:col-span-6"><input className="input" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} /></Field>
          <Field label="Correct approach / lesson" className="sm:col-span-4"><input className="input" value={f.fix} onChange={(e) => setF({ ...f, fix: e.target.value })} onKeyDown={(e) => e.key === "Enter" && save()} /></Field>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button className="btn flex-1" onClick={save}>{editId ? "Save changes" : "Log it"}</button>
            {editId && <button className="btn-ghost" onClick={() => { setEditId(null); setF(blank); }}>Cancel</button>}
          </div>
        </div>
      </div>

      <div className="my-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[.03]">
          {(["open", "resolved", "all"] as const).map((x) => (
            <button key={x} onClick={() => setFilter(x)} className={`cursor-pointer rounded-lg px-3 py-1 text-sm capitalize ${filter === x ? "bg-brand-500 text-white" : "text-slate-500"}`}>{x}</button>
          ))}
        </div>
        <select className="input !w-auto" value={kind} onChange={(e) => setKind(e.target.value as MistakeKind | "")}>
          <option value="">All types</option>{Object.keys(kinds).map((k) => <option key={k}>{k}</option>)}
        </select>
        <select className="input !w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">All subjects</option>{catalog.subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-500">{list.length} shown</span>
      </div>

      <div className="space-y-3">
        {list.map((m) => (
          <div key={m.id} className={`card transition ${m.resolved ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`chip ${kinds[m.kind]}`}>{m.kind}</span>
              <span className="text-xs text-slate-500">{m.subject}{m.topic && ` › ${m.topic}`} · {formatDate(m.date)}</span>
              <div className="ml-auto flex items-center">
                <button className="icon-btn hover:!text-brand-600" aria-label="Add to revision" title="Add to revision" onClick={() => toRevision(m)}><BookmarkPlus size={15} /></button>
                <button className="icon-btn hover:!text-brand-600" aria-label="Edit" title="Edit" onClick={() => edit(m)}><Pencil size={14} /></button>
                <button className="icon-btn hover:!text-emerald-500" aria-label={m.resolved ? "Reopen" : "Resolve"} title={m.resolved ? "Reopen" : "Mark resolved"} onClick={() => patch(m.id, { resolved: !m.resolved })}>{m.resolved ? <Undo2 size={15} /> : <Check size={16} />}</button>
                <button className="icon-btn" aria-label="Delete" onClick={() => remove("mistakes", m.id, "Mistake")}><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-900 dark:text-white">{m.question}</div>
            {m.fix && <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">💡 {m.fix}</div>}
          </div>
        ))}
        {!list.length && <div className="card"><Empty icon={<TriangleAlert size={28} />} text="Nothing here" /></div>}
      </div>
    </>
  );
}
