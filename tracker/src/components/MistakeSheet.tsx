import { useState } from "react";
import { BookmarkPlus, Plus, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { useRemove } from "../lib/undo";
import { useToast } from "./Toast";
import { uid } from "../lib/ids";
import { addDays, todayISO } from "../lib/dates";
import { REASONS, REASON_KEYS, marksOf } from "../lib/reasons";
import type { Mistake } from "../lib/types";

type Props = {
  rows: Mistake[];
  /** applied to newly added rows (mockId or session) */
  defaults: Partial<Mistake>;
  showSource?: boolean;
};

/** Excel-style editable grid: one row per wrong / skipped question. */
export default function MistakeSheet({ rows, defaults, showSource }: Props) {
  const { state, catalog, setState } = useStore();
  const remove = useRemove();
  const toast = useToast();
  const [focusId, setFocusId] = useState<string | null>(null);

  const patch = (id: string, c: Partial<Mistake>) => setState((p) => ({ ...p, mistakes: p.mistakes.map((m) => (m.id === id ? { ...m, ...c } : m)) }));

  const add = () => {
    const last = rows[rows.length - 1];
    const row: Mistake = {
      id: uid(), date: todayISO(), subject: last?.subject ?? catalog.subjects[0], topic: "", kind: "concept",
      question: "", fix: "", resolved: false, result: "wrong", marks: last?.marks ?? 1,
      qno: defaults.mockId ? Math.max(0, ...rows.map((r) => r.qno ?? 0)) + 1 : undefined,
      ...defaults,
    };
    setState((p) => ({ ...p, mistakes: [...p.mistakes, row] }));
    setFocusId(row.id);
  };

  const toRevision = (m: Mistake) => {
    const topic = m.topic || m.question.slice(0, 60);
    if (!topic) return toast("Add a topic first");
    if (state.revisions.some((r) => r.topic === topic && r.subject === m.subject)) return toast("Already in revision");
    setState((p) => ({ ...p, revisions: [...p.revisions, { id: uid(), subject: m.subject, topic, notes: m.fix, lastReviewed: todayISO(), nextDue: addDays(todayISO(), 1), intervalDays: 1 }] }));
    toast(`“${topic}” added to revision`);
  };

  const sourceName = (m: Mistake) => (m.mockId ? state.mocks.find((x) => x.id === m.mockId)?.name ?? "Mock" : m.session ?? "—");

  return (
    <div>
      <div className="sheet-wrap max-h-[70vh]">
        <table className="sheet min-w-[1280px] table-fixed">
          <thead>
            <tr>
              <th className="w-10 text-center">#</th>
              {showSource && <th className="w-36">Source</th>}
              <th className="w-16">Q no</th>
              <th className="w-56">Subject</th>
              <th className="w-40">Topic</th>
              <th className="w-20">Marks</th>
              <th className="w-28">Result</th>
              <th className="w-52">Why wrong</th>
              <th>What went wrong</th>
              <th>Lesson / correct approach</th>
              <th className="w-10 text-center">✓</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={m.id} className={m.resolved ? "opacity-50" : ""}>
                <td className="px-2 text-center text-xs text-slate-400">{i + 1}</td>
                {showSource && <td className="truncate px-3 text-xs text-slate-500" title={sourceName(m)}>{sourceName(m)}</td>}
                <td><input className="cell" type="number" value={m.qno ?? ""} autoFocus={m.id === focusId} onChange={(e) => patch(m.id, { qno: e.target.value ? Number(e.target.value) : undefined })} /></td>
                <td><select className="cell" value={m.subject} onChange={(e) => patch(m.id, { subject: e.target.value })}>{catalog.subjects.map((s) => <option key={s}>{s}</option>)}</select></td>
                <td><input className="cell" placeholder="topic" value={m.topic} onChange={(e) => patch(m.id, { topic: e.target.value })} /></td>
                <td><select className="cell" value={marksOf(m)} onChange={(e) => patch(m.id, { marks: Number(e.target.value) })}><option value={1}>1</option><option value={2}>2</option></select></td>
                <td><select className="cell" value={m.result ?? "wrong"} onChange={(e) => patch(m.id, { result: e.target.value as Mistake["result"] })}><option value="wrong">Wrong</option><option value="skipped">Skipped</option></select></td>
                <td>
                  <select className="cell font-medium" value={m.kind} onChange={(e) => patch(m.id, { kind: e.target.value as Mistake["kind"] })}>
                    {REASON_KEYS.map((k) => <option key={k} value={k}>{REASONS[k].label}</option>)}
                  </select>
                </td>
                <td><input className="cell" placeholder="e.g. used wrong page size" value={m.question} onChange={(e) => patch(m.id, { question: e.target.value })} /></td>
                <td><input className="cell" placeholder="how to get it right" value={m.fix} onChange={(e) => patch(m.id, { fix: e.target.value })} onKeyDown={(e) => e.key === "Enter" && i === rows.length - 1 && add()} /></td>
                <td className="text-center"><input type="checkbox" className="size-4 cursor-pointer accent-indigo-600" checked={m.resolved} onChange={() => patch(m.id, { resolved: !m.resolved })} title="Revised / resolved" /></td>
                <td className="whitespace-nowrap px-1 text-center">
                  <button className="icon-btn !size-7 hover:!text-brand-600" aria-label="Add to revision" title="Add to revision" onClick={() => toRevision(m)}><BookmarkPlus size={14} /></button>
                  <button className="icon-btn !size-7" aria-label="Delete" onClick={() => remove("mistakes", m.id, "Row")}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={showSource ? 12 : 11} className="py-10 text-center text-sm text-slate-400">No rows yet — add the questions you got wrong or skipped.</td></tr>}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={showSource ? 12 : 11}>
                <div className="flex items-center gap-4">
                  <button className="btn !py-1" onClick={add}><Plus size={14} />Add row</button>
                  <span>{rows.length} rows · {rows.filter((r) => (r.result ?? "wrong") === "wrong").length} wrong · {rows.filter((r) => r.result === "skipped").length} skipped · {rows.reduce((a, r) => a + marksOf(r), 0)} marks lost · {rows.filter((r) => r.resolved).length} resolved</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
