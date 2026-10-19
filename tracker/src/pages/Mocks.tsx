import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LineIcon, Pencil, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { uid } from "../lib/ids";
import { formatDate, todayISO } from "../lib/dates";
import type { MockAttempt } from "../lib/types";
import { Empty, Field, HoursInput, PageHeader } from "../components/ui";
import { fmtDur } from "../lib/schedule";
import { useRemove } from "../lib/undo";

const blank = { name: "", source: "GateQA", type: "full" as "full" | "custom" | "test", subjects: [] as string[], date: todayISO(), score: "", maxScore: "100", timeMin: undefined as number | undefined, correct: "", wrong: "", skipped: "", weak: [] as string[], notes: "" };
const n = (v: string) => (v === "" ? undefined : Number(v));

export default function Mocks() {
  const { state, catalog, setState } = useStore();
  const remove = useRemove();
  const nav = useNavigate();
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const isTest = f.type === "test";

  const save = () => {
    if (!f.name || f.score === "") return;
    if (f.type === "test" && f.subjects.length === 0) return alert("Pick at least one subject for this test.");
    const m: MockAttempt = {
      id: editId ?? uid(), name: f.name, source: f.source.trim(), type: f.type,
      subjects: f.type !== "full" ? f.subjects : undefined, date: f.date,
      score: Number(f.score), maxScore: Number(f.maxScore) || 100,
      timeMin: f.timeMin || undefined, correct: n(f.correct), wrong: n(f.wrong), skipped: n(f.skipped),
      weakSubjects: f.weak, notes: f.notes,
    };
    if (editId) setState((p) => ({ ...p, mocks: p.mocks.map((x) => (x.id === editId ? m : x)) }));
    else setState((p) => ({ ...p, mocks: [m, ...p.mocks] }));
    setEditId(null);
    setF({ ...blank, date: f.date, source: f.source, type: f.type });
    if (!editId) nav(`/mocks/${m.id}`); // go log the wrong questions
  };

  const edit = (m: MockAttempt) => {
    setEditId(m.id);
    setF({ name: m.name, source: m.source, type: m.type ?? "full", subjects: m.subjects ?? [], date: m.date, score: String(m.score), maxScore: String(m.maxScore), timeMin: m.timeMin || undefined, correct: m.correct?.toString() ?? "", wrong: m.wrong?.toString() ?? "", skipped: m.skipped?.toString() ?? "", weak: m.weakSubjects, notes: m.notes });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sorted = [...state.mocks].sort((a, b) => a.date.localeCompare(b.date));
  const trend = sorted.map((m) => ({ name: formatDate(m.date), pct: Math.round((m.score / m.maxScore) * 100) }));
  const weak = catalog.subjects
    .map((s) => ({ subject: s, count: state.mocks.filter((m) => m.weakSubjects.includes(s)).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
  const best = trend.length ? Math.max(...trend.map((t) => t.pct)) : 0;
  const avg = trend.length ? Math.round(trend.reduce((a, t) => a + t.pct, 0) / trend.length) : 0;

  const pill = (active: boolean, tone: string) => `chip cursor-pointer border transition ${active ? `${tone} text-white` : "border-slate-200 hover:border-slate-400 dark:border-white/10"}`;

  return (
    <>
      <PageHeader title="Mock Analysis" sub="Log a mock or a subject test, then open it to record every wrong question and why it went wrong." />

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className={`card h-fit xl:sticky xl:top-4 ${editId ? "ring-2 ring-brand-500" : ""}`}>
          <div className="card-title">{editId ? `Edit ${isTest ? "test" : "mock"}` : `Log a ${isTest ? "test" : "mock"}`}</div>
          <div className="grid grid-cols-6 gap-3">
            <Field label="Name" className="col-span-6"><input className="input" placeholder={isTest ? "e.g. OS – Deadlocks test" : "e.g. GateQA Full Mock 4"} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Source" className="col-span-3"><input className="input" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} /></Field>
            <Field label="Date" className="col-span-3"><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Score" className="col-span-2"><input className="input" type="number" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} /></Field>
            <Field label="Out of" className="col-span-2"><input className="input" type="number" value={f.maxScore} onChange={(e) => setF({ ...f, maxScore: e.target.value })} /></Field>
            <Field label="Time (hours.min)" className="col-span-2"><HoursInput minutes={f.timeMin} onChange={(v) => setF({ ...f, timeMin: v })} /></Field>
            <Field label="Correct" className="col-span-2"><input className="input" type="number" value={f.correct} onChange={(e) => setF({ ...f, correct: e.target.value })} /></Field>
            <Field label="Wrong" className="col-span-2"><input className="input" type="number" value={f.wrong} onChange={(e) => setF({ ...f, wrong: e.target.value })} /></Field>
            <Field label="Skipped" className="col-span-2"><input className="input" type="number" value={f.skipped} onChange={(e) => setF({ ...f, skipped: e.target.value })} /></Field>
            <div className="col-span-6">
              <span className="label">Type</span>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[.03]">
                {(["full", "custom", "test"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setF({ ...f, type: t, weak: [] })} className={`cursor-pointer rounded-lg px-4 py-1 text-sm ${f.type === t ? "bg-brand-500 text-white" : "text-slate-500"}`}>{t === "full" ? "Full mock" : t === "custom" ? "Custom mock" : "Test"}</button>
                ))}
              </div>
            </div>
            {f.type !== "full" && (
              <div className="col-span-6">
                <span className="label">{isTest ? "Subjects (one or more)" : "Subjects covered"}</span>
                <div className="flex flex-wrap gap-1.5">
                  {catalog.subjects.map((s) => (
                    <button key={s} type="button" onClick={() => { setF({ ...f, subjects: f.subjects.includes(s) ? f.subjects.filter((x) => x !== s) : [...f.subjects, s], weak: f.weak.filter((x) => x !== s) }); }} className={pill(f.subjects.includes(s), "border-brand-500 bg-brand-500")}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="col-span-6">
              <span className="label">Weak subjects</span>
              <div className="flex flex-wrap gap-1.5">
                {(f.type !== "full" ? f.subjects : catalog.subjects).map((s) => (
                  <button key={s} type="button" onClick={() => setF({ ...f, weak: f.weak.includes(s) ? f.weak.filter((x) => x !== s) : [...f.weak, s] })} className={pill(f.weak.includes(s), "border-rose-500 bg-rose-500")}>{s}</button>
                ))}
              </div>
            </div>
            <div className="col-span-6 flex gap-2">
              <button className="btn flex-1" onClick={save}>{editId ? "Save changes" : `Add ${isTest ? "test" : "mock"} & log mistakes →`}</button>
              {editId && <button className="btn-ghost" onClick={() => { setEditId(null); setF(blank); }}>Cancel</button>}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[["Average", `${avg}%`], ["Best", `${best}%`], ["Mocks", trend.length]].map(([l, v]) => (
              <div key={l} className="stat"><div className="text-xs text-slate-500">{l}</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{v}</div></div>
            ))}
          </div>

          {trend.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="card">
                <div className="card-title">Score trend</div>
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" /><XAxis dataKey="name" fontSize={11} tickLine={false} /><YAxis domain={[0, 100]} fontSize={11} tickLine={false} unit="%" /><Tooltip /><Line dataKey="pct" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} /></LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <div className="card-title">Weak subjects (frequency)</div>
                {weak.length ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={weak} layout="vertical"><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="subject" width={130} fontSize={11} tickLine={false} /><Tooltip cursor={{ fill: "rgba(244,63,94,.08)" }} /><Bar dataKey="count" fill="#f43f5e" radius={[0, 6, 6, 0]} /></BarChart>
                  </ResponsiveContainer>
                ) : <Empty icon={<LineIcon />} text="Tag weak subjects when logging" />}
              </div>
            </div>
          )}

          <div className="sheet-wrap">
            <table className="sheet">
              <thead>
                <tr><th>Date</th><th>Mock / test</th><th>Type</th><th className="text-right">Score</th><th className="text-right">%</th><th className="text-right">✓</th><th className="text-right">✗</th><th className="text-right">Skip</th><th className="text-right">Time</th><th className="text-right">Rows logged</th><th /></tr>
              </thead>
              <tbody>
                {state.mocks.map((m) => {
                  const rows = state.mistakes.filter((x) => x.mockId === m.id);
                  const wrong = m.wrong ?? rows.filter((r) => (r.result ?? "wrong") === "wrong").length;
                  const skipped = m.skipped ?? rows.filter((r) => r.result === "skipped").length;
                  return (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{formatDate(m.date)}</td>
                      <td className="px-3 py-2.5"><Link to={`/mocks/${m.id}`} className="font-medium text-brand-600 hover:underline">{m.name}</Link><div className="text-xs text-slate-400">{m.source}</div></td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{m.type === "test" ? `Test · ${m.subjects?.join(", ") || "—"}` : m.type === "custom" ? `Custom · ${m.subjects?.length ?? 0} subj` : "Full"}</td>
                      <td className="px-3 py-2.5 text-right">{m.score}/{m.maxScore}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{Math.round((m.score / m.maxScore) * 100)}%</td>
                      <td className="px-3 py-2.5 text-right text-emerald-600">{m.correct ?? "–"}</td>
                      <td className="px-3 py-2.5 text-right text-rose-600">{wrong || "–"}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500">{skipped || "–"}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500">{m.timeMin ? fmtDur(m.timeMin) : "–"}</td>
                      <td className="px-3 py-2.5 text-right">{rows.length ? <Link to={`/mocks/${m.id}`} className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{rows.length}</Link> : <Link to={`/mocks/${m.id}`} className="text-xs text-slate-400 hover:text-brand-600">add</Link>}</td>
                      <td className="whitespace-nowrap px-1 text-right">
                        <button className="icon-btn hover:!text-brand-600" aria-label="Edit" onClick={() => edit(m)}><Pencil size={14} /></button>
                        <button className="icon-btn" aria-label="Delete" onClick={() => remove("mocks", m.id, "Mock")}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
                {!state.mocks.length && <tr><td colSpan={11}><Empty icon={<LineIcon size={28} />} text="No mocks logged yet" /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
