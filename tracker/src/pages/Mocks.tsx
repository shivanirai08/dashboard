import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardCheck, Layers, Trophy } from "lucide-react";
import { useStore } from "../lib/store";
import { uid } from "../lib/ids";
import { todayISO } from "../lib/dates";
import type { MockAttempt } from "../lib/types";
import { PageHeader } from "../components/ui";
import { useRemove } from "../lib/undo";
import { AttemptForm, AttemptTable, KIND_META, kindOf, type FormState, type Kind } from "../components/mocks/shared";
import { CustomAnalytics, FullAnalytics, TestAnalytics } from "../components/mocks/analytics";

const TABS: { kind: Kind; icon: typeof Trophy }[] = [{ kind: "full", icon: Trophy }, { kind: "custom", icon: Layers }, { kind: "test", icon: ClipboardCheck }];

const blank = (kind: Kind, date = todayISO()): FormState => ({
  name: "", source: kind === "test" ? "" : "GateQA", date, score: "", maxScore: "100", timeMin: undefined,
  correct: "", wrong: "", skipped: "", subjects: [], weak: [], topics: [], whole: true, notes: "",
});
const n = (v: string) => (v === "" ? undefined : Number(v));

export default function Mocks() {
  const { state, catalog, setState } = useStore();
  const remove = useRemove();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get("kind");
  const kind: Kind = q === "custom" || q === "test" ? q : "full";
  const [f, setF] = useState(() => blank(kind));
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const mocks = state.mocks.filter((m) => kindOf(m) === kind);
  const meta = KIND_META[kind];
  const topicSuggestions = [...new Set(state.mocks.filter((m) => m.type === "test" && m.subjects?.[0] === f.subjects[0]).flatMap((m) => m.topics ?? []))];

  const switchKind = (k: Kind) => {
    setParams(k === "full" ? {} : { kind: k });
    setEditId(null);
    setErr("");
    setF(blank(k, f.date));
  };

  const save = () => {
    if (!f.name.trim()) return setErr("Give it a name.");
    if (f.score === "" || Number.isNaN(Number(f.score))) return setErr("Enter the marks you got.");
    if (!(Number(f.maxScore) > 0)) return setErr("“Out of” must be more than 0.");
    if (kind === "custom" && f.subjects.length < 2) return setErr("A custom mock covers 2 or more subjects. For one subject, log a subject test.");
    if (kind === "test" && f.subjects.length !== 1) return setErr("Choose the subject this test is on.");
    if (kind === "test" && !f.whole && !f.topics.length) return setErr("Add at least one topic, or choose “Whole subject”.");
    const m: MockAttempt = {
      id: editId ?? uid(), name: f.name.trim(), source: f.source.trim(), type: kind,
      subjects: kind === "full" ? undefined : f.subjects,
      topics: kind === "test" && !f.whole ? f.topics : undefined,
      wholeSubject: kind === "test" ? f.whole : undefined,
      date: f.date, score: Number(f.score), maxScore: Number(f.maxScore),
      timeMin: f.timeMin || undefined, correct: n(f.correct), wrong: n(f.wrong), skipped: n(f.skipped),
      weakSubjects: kind === "test" ? [] : f.weak, notes: f.notes,
    };
    if (editId) setState((p) => ({ ...p, mocks: p.mocks.map((x) => (x.id === editId ? m : x)) }));
    else setState((p) => ({ ...p, mocks: [m, ...p.mocks] }));
    setEditId(null);
    setErr("");
    setF({ ...blank(kind, f.date), source: f.source });
    if (!editId) nav(`/mocks/${m.id}`); // go log the wrong questions
  };

  const edit = (m: MockAttempt) => {
    setEditId(m.id);
    setErr("");
    setF({
      name: m.name, source: m.source, date: m.date, score: String(m.score), maxScore: String(m.maxScore), timeMin: m.timeMin || undefined,
      correct: m.correct?.toString() ?? "", wrong: m.wrong?.toString() ?? "", skipped: m.skipped?.toString() ?? "",
      subjects: m.subjects ?? [], weak: m.weakSubjects, topics: m.topics ?? [], whole: m.wholeSubject ?? !m.topics?.length, notes: m.notes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <PageHeader title="Mocks & Tests" sub={meta.sub} />

      <div role="tablist" aria-label="Kind of attempt" className="mb-5 inline-flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[.03]">
        {TABS.map(({ kind: k, icon: Icon }) => {
          const count = state.mocks.filter((m) => kindOf(m) === k).length;
          const on = k === kind;
          return (
            <button key={k} role="tab" aria-selected={on} onClick={() => switchKind(k)}
              className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${on ? "text-white shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
              style={on ? { background: KIND_META[k].color } : undefined}>
              <Icon size={15} />{KIND_META[k].label}<span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/25" : "bg-slate-100 dark:bg-white/10"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]" role="tabpanel">
        <AttemptForm kind={kind} f={f} setF={setF} editing={!!editId} err={err} subjects={catalog.subjects} topicSuggestions={topicSuggestions}
          onSave={save} onCancel={() => { setEditId(null); setErr(""); setF(blank(kind)); }} />
        <div className="min-w-0 space-y-5">
          {kind === "full" && <FullAnalytics mocks={mocks} subjects={catalog.subjects} />}
          {kind === "custom" && <CustomAnalytics mocks={mocks} subjects={catalog.subjects} />}
          {kind === "test" && <TestAnalytics mocks={mocks} />}
          <AttemptTable kind={kind} mocks={mocks} mistakes={state.mistakes} onEdit={edit} onDelete={(m) => remove("mocks", m.id, kind === "test" ? "Test" : "Mock")} />
        </div>
      </div>
    </>
  );
}
