import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LineIcon, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { uid } from "../lib/ids";
import { formatDate, todayISO } from "../lib/dates";
import type { MockAttempt } from "../lib/types";
import { Empty, Field, PageHeader } from "../components/ui";

const blank = { name: "", source: "GateQA", type: "full" as "full" | "custom", subjects: [] as string[], date: todayISO(), score: "", maxScore: "100", timeMin: "", weak: [] as string[], notes: "" };

export default function Mocks() {
  const { state, catalog, setState } = useStore();
  const [f, setF] = useState(blank);

  const add = () => {
    if (!f.name || f.score === "") return;
    const m: MockAttempt = {
      id: uid(), name: f.name, source: f.source.trim(), type: f.type,
      subjects: f.type === "custom" ? f.subjects : undefined, date: f.date,
      score: Number(f.score), maxScore: Number(f.maxScore) || 100,
      timeMin: f.timeMin ? Number(f.timeMin) : undefined, weakSubjects: f.weak, notes: f.notes,
    };
    setState((p) => ({ ...p, mocks: [m, ...p.mocks] }));
    setF({ ...blank, date: f.date, source: f.source, type: f.type });
  };

  const sorted = [...state.mocks].sort((a, b) => a.date.localeCompare(b.date));
  const trend = sorted.map((m) => ({ name: formatDate(m.date), pct: Math.round((m.score / m.maxScore) * 100) }));
  const weak = catalog.subjects
    .map((s) => ({ subject: s, count: state.mocks.filter((m) => m.weakSubjects.includes(s)).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
  const best = trend.length ? Math.max(...trend.map((t) => t.pct)) : 0;
  const avg = trend.length ? Math.round(trend.reduce((a, t) => a + t.pct, 0) / trend.length) : 0;

  return (
    <>
      <PageHeader title="Mock Analysis" sub="Take mocks on GateQA, log them here, spot the patterns." />

      <div className="card">
        <div className="card-title">Log a mock</div>
        <div className="grid gap-3 sm:grid-cols-6">
          <Field label="Name" className="sm:col-span-3"><input className="input" placeholder="e.g. GateQA Full Mock 4" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Source" className="sm:col-span-2"><input className="input" placeholder="GateQA, GO, test series…" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} /></Field>
          <Field label="Date"><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Score" className="sm:col-span-2"><input className="input" type="number" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} /></Field>
          <Field label="Out of" className="sm:col-span-2"><input className="input" type="number" value={f.maxScore} onChange={(e) => setF({ ...f, maxScore: e.target.value })} /></Field>
          <Field label="Time taken (min)" className="sm:col-span-2"><input className="input" type="number" value={f.timeMin} onChange={(e) => setF({ ...f, timeMin: e.target.value })} /></Field>
          <div className="sm:col-span-6">
            <span className="label">Mock type</span>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[.03]">
              {(["full", "custom"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setF({ ...f, type: t, weak: [] })} className={`cursor-pointer rounded-lg px-4 py-1 text-sm ${f.type === t ? "bg-brand-500 text-white" : "text-slate-500"}`}>{t === "full" ? "Full mock" : "Custom (pick subjects)"}</button>
              ))}
            </div>
          </div>
          {f.type === "custom" && (
            <div className="sm:col-span-6">
              <span className="label">Subjects covered</span>
              <div className="flex flex-wrap gap-1.5">
                {catalog.subjects.map((s) => (
                  <button key={s} type="button" onClick={() => setF({ ...f, subjects: f.subjects.includes(s) ? f.subjects.filter((x) => x !== s) : [...f.subjects, s], weak: f.weak.filter((x) => x !== s) })}
                    className={`chip cursor-pointer border transition ${f.subjects.includes(s) ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 hover:border-brand-500 dark:border-white/10"}`}>{s}</button>
                ))}
              </div>
            </div>
          )}
          <div className="sm:col-span-6">
            <span className="label">Weak subjects in this mock</span>
            <div className="flex flex-wrap gap-1.5">
              {(f.type === "custom" ? f.subjects : catalog.subjects).map((s) => (
                <button key={s} type="button" onClick={() => setF({ ...f, weak: f.weak.includes(s) ? f.weak.filter((x) => x !== s) : [...f.weak, s] })}
                  className={`chip cursor-pointer border transition ${f.weak.includes(s) ? "border-rose-500 bg-rose-500 text-white" : "border-slate-200 hover:border-rose-300 dark:border-white/10"}`}>{s}</button>
              ))}
            </div>
          </div>
          <Field label="Notes" className="sm:col-span-5"><input className="input" placeholder="What went wrong / right?" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <div className="flex items-end"><button className="btn w-full" onClick={add}>Add mock</button></div>
        </div>
      </div>

      {trend.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[["Average", `${avg}%`], ["Best", `${best}%`], ["Mocks", trend.length]].map(([l, v]) => (
              <div key={l} className="card"><div className="text-xs text-slate-500">{l}</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{v}</div></div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="card">
              <div className="card-title">Score trend</div>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" /><XAxis dataKey="name" fontSize={11} tickLine={false} /><YAxis domain={[0, 100]} fontSize={11} tickLine={false} unit="%" /><Tooltip /><Line dataKey="pct" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} /></LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="card-title">Weak subjects (frequency)</div>
              {weak.length ? (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={weak} layout="vertical"><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="subject" width={130} fontSize={11} tickLine={false} /><Tooltip cursor={{ fill: "rgba(244,63,94,.08)" }} /><Bar dataKey="count" fill="#f43f5e" radius={[0, 6, 6, 0]} /></BarChart>
                </ResponsiveContainer>
              ) : <Empty icon={<LineIcon />} text="Tag weak subjects when logging" />}
            </div>
          </div>
        </>
      )}

      <div className="card mt-4 overflow-x-auto !p-0">
        <table className="w-full">
          <thead><tr><th className="th">Date</th><th className="th">Mock</th><th className="th">Score</th><th className="th">Time</th><th className="th">Weak</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {state.mocks.map((m) => (
              <tr key={m.id}>
                <td className="td whitespace-nowrap text-slate-500">{formatDate(m.date)}</td>
                <td className="td"><div className="font-medium text-slate-900 dark:text-white">{m.name} <span className="chip ml-1 bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{m.type === "custom" ? "Custom" : "Full"}{m.source && ` · ${m.source}`}</span></div>{m.type === "custom" && m.subjects && <div className="text-xs text-slate-500">{m.subjects.join(", ")}</div>}{m.notes && <div className="text-xs text-slate-500">{m.notes}</div>}</td>
                <td className="td"><span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{m.score}/{m.maxScore}</span></td>
                <td className="td text-slate-500">{m.timeMin ? `${m.timeMin}m` : "–"}</td>
                <td className="td text-xs text-slate-500">{m.weakSubjects.join(", ") || "–"}</td>
                <td className="td"><button className="icon-btn" aria-label="Delete" onClick={() => setState((p) => ({ ...p, mocks: p.mocks.filter((x) => x.id !== m.id) }))}><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!state.mocks.length && <Empty icon={<LineIcon size={28} />} text="No mocks logged yet" />}
      </div>
    </>
  );
}
