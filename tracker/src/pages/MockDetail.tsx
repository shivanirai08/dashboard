import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "../lib/store";
import { formatDate } from "../lib/dates";
import MistakeSheet from "../components/MistakeSheet";
import { ReasonBreakdown, SubjectMatrix } from "../components/Analysis";
import { marksOf } from "../lib/reasons";
import { Empty } from "../components/ui";
import { fmtDur } from "../lib/schedule";
import type { MockAttempt } from "../lib/types";

export default function MockDetail() {
  const { id } = useParams();
  const { state, setState } = useStore();
  const mock = state.mocks.find((m) => m.id === id);
  if (!mock) return <div className="card"><Empty icon={<ArrowLeft />} text="Mock not found" /><Link className="btn mx-auto" to="/mocks">Back to mocks</Link></div>;

  const rows = state.mistakes.filter((m) => m.mockId === mock.id);
  const sheetWrong = rows.filter((r) => (r.result ?? "wrong") === "wrong").length;
  const sheetSkipped = rows.filter((r) => r.result === "skipped").length;
  const wrong = mock.wrong ?? sheetWrong;
  const skipped = mock.skipped ?? sheetSkipped;
  const correct = mock.correct;
  const attempted = (correct ?? 0) + wrong;
  const patch = (c: Partial<MockAttempt>) => setState((p) => ({ ...p, mocks: p.mocks.map((m) => (m.id === mock.id ? { ...m, ...c } : m)) }));
  const num = (v: string) => (v === "" ? undefined : Math.max(0, Number(v)));

  const stats: [string, string | number, string?][] = [
    ["Score", `${mock.score}/${mock.maxScore}`, `${Math.round((mock.score / mock.maxScore) * 100)}%`],
    ["Accuracy", correct !== undefined && attempted ? `${Math.round((correct / attempted) * 100)}%` : "–", "of attempted"],
    ["Marks lost", rows.reduce((a, r) => a + marksOf(r), 0), "from logged rows"],
    ["Silly + calc", rows.filter((r) => r.kind === "silly" || r.kind === "calculation" || r.kind === "misread").length, "avoidable"],
    ["Concept gaps", rows.filter((r) => r.kind === "concept").length, "to study"],
  ];

  return (
    <div className="space-y-5">
      <div>
        <Link to={mock.type === "test" || mock.type === "custom" ? `/mocks?kind=${mock.type}` : "/mocks"} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft size={14} />{mock.type === "test" ? "All subject tests" : mock.type === "custom" ? "All custom mocks" : "All full mocks"}</Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{mock.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{formatDate(mock.date)} · {mock.source || "—"} · {mock.type === "test" ? `Test · ${mock.subjects?.[0] ?? "no subject"} · ${mock.wholeSubject || !mock.topics?.length ? "whole subject" : mock.topics.join(", ")}` : mock.type === "custom" ? `Custom (${mock.subjects?.join(", ") || "no subjects"})` : "Full mock"}{mock.timeMin ? ` · ${fmtDur(mock.timeMin)}` : ""}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(([l, v, s]) => (
          <div key={l} className="stat"><div className="text-xs text-slate-500">{l}</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{v}</div>{s && <div className="text-xs text-slate-400">{s}</div>}</div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Question outcome</div>
        <div className="flex flex-wrap items-end gap-4">
          {([["Correct", correct, "correct", "text-emerald-600"], ["Wrong", mock.wrong, "wrong", "text-rose-600"], ["Skipped", mock.skipped, "skipped", "text-slate-500"]] as const).map(([l, v, k, c]) => (
            <label key={k}>
              <span className={`label ${c}`}>{l}</span>
              <input className="input !w-24" type="number" min={0} value={v ?? ""} placeholder={k === "wrong" ? String(sheetWrong) : k === "skipped" ? String(sheetSkipped) : "0"} onChange={(e) => patch({ [k]: num(e.target.value) })} />
            </label>
          ))}
          <div className="text-sm text-slate-500">{(correct ?? 0) + wrong + skipped} questions · {wrong === sheetWrong ? "wrong rows match the sheet ✓" : `sheet has ${sheetWrong} wrong rows — log the rest below`}</div>
        </div>
        <textarea className="input mt-4" rows={2} placeholder="Overall notes…" value={mock.notes} onChange={(e) => patch({ notes: e.target.value })} />
      </div>

      <div>
        <div className="card-title">Questions to review · wrong &amp; skipped</div>
        <MistakeSheet rows={rows} defaults={{ mockId: mock.id }} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="min-w-0"><div className="card-title">Why they went wrong</div><ReasonBreakdown rows={rows} /></div>
        <div className="min-w-0"><div className="card-title">Subject × reason</div><SubjectMatrix rows={rows} /></div>
      </div>
    </div>
  );
}
