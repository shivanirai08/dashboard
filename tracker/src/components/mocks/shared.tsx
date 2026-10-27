import { useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { formatDate } from "../../lib/dates";
import { fmtDur } from "../../lib/schedule";
import { Field, HoursInput } from "../ui";
import type { Mistake, MockAttempt } from "../../lib/types";

export type Kind = "full" | "custom" | "test";

export const KIND_META: Record<Kind, { label: string; plural: string; noun: string; sub: string; color: string }> = {
  full: { label: "Full mocks", plural: "Full mocks", noun: "mock", sub: "Whole-paper attempts. Track overall score, accuracy and which subjects keep letting you down.", color: "#6366f1" },
  custom: { label: "Custom mocks", plural: "Custom mocks", noun: "custom mock", sub: "A paper over a few chosen subjects. See how each subject holds up across these mixes.", color: "#8b5cf6" },
  test: { label: "Subject tests", plural: "Subject tests", noun: "test", sub: "One subject — specific topics or the whole subject. See which subjects and topics are solid.", color: "#14b8a6" },
};

export const kindOf = (m: MockAttempt): Kind => m.type ?? "full";
export const pct = (m: MockAttempt) => (m.maxScore ? Math.round((m.score / m.maxScore) * 100) : 0);
export const avgOf = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export type FormState = {
  name: string; source: string; date: string; score: string; maxScore: string; timeMin: number | undefined;
  correct: string; wrong: string; skipped: string; subjects: string[]; weak: string[]; topics: string[]; whole: boolean; notes: string;
};

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="stat">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

const pill = (active: boolean, tone: string) => `chip cursor-pointer border transition ${active ? `${tone} text-white` : "border-slate-200 hover:border-slate-400 dark:border-white/10"}`;
const toggle = (xs: string[], v: string) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);

function TopicInput({ topics, onChange, suggestions, disabled }: { topics: string[]; onChange: (t: string[]) => void; suggestions: string[]; disabled: boolean }) {
  const [text, setText] = useState("");
  const add = () => {
    const parts = text.split(",").map((x) => x.trim()).filter(Boolean);
    if (parts.length) onChange([...topics, ...parts.filter((p) => !topics.some((t) => t.toLowerCase() === p.toLowerCase()))]);
    setText("");
  };
  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="flex gap-2">
        <input className="input" list="topic-suggestions" disabled={disabled} placeholder="Add a topic…" aria-label="Add a topic" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add} />
        <button type="button" className="btn-ghost" disabled={disabled || !text.trim()} onClick={add} aria-label="Add topic"><Plus size={15} /></button>
      </div>
      <datalist id="topic-suggestions">{suggestions.filter((s) => !topics.includes(s)).map((s) => <option key={s} value={s} />)}</datalist>
      {topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {topics.map((t) => (
            <span key={t} className="chip bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200">{t}
              <button type="button" className="ml-1 cursor-pointer" aria-label={`Remove ${t}`} onClick={() => onChange(topics.filter((x) => x !== t))}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type FormProps = {
  kind: Kind; f: FormState; setF: (f: FormState) => void; editing: boolean; err: string; subjects: string[];
  topicSuggestions: string[]; onSave: () => void; onCancel: () => void;
};

/** One form shell; the "scope" block in the middle is what differs per kind. */
export function AttemptForm({ kind, f, setF, editing, err, subjects, topicSuggestions, onSave, onCancel }: FormProps) {
  const meta = KIND_META[kind];
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF({ ...f, [k]: v });
  return (
    <form className={`card h-fit xl:sticky xl:top-4 ${editing ? "ring-2 ring-brand-500" : ""}`} onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <div className="card-title flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: meta.color }} aria-hidden />{editing ? `Edit ${meta.noun}` : `Log a ${meta.noun}`}</div>
      <div className="grid grid-cols-6 gap-3">
        <Field label="Name" className="col-span-6"><input className="input" placeholder={kind === "test" ? "OS – Deadlocks" : kind === "custom" ? "Algo + TOC mix" : "Full Mock 4"} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>

        {kind === "custom" && (
          <div className="col-span-6">
            <span className="label">Subjects covered <span className="text-slate-400">(2 or more)</span></span>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => <button key={s} type="button" aria-pressed={f.subjects.includes(s)} onClick={() => setF({ ...f, subjects: toggle(f.subjects, s), weak: f.weak.filter((x) => x !== s) })} className={pill(f.subjects.includes(s), "border-violet-500 bg-violet-500")}>{s}</button>)}
            </div>
          </div>
        )}

        {kind === "test" && (
          <>
            <Field label="Subject" className="col-span-6">
              <select className="input" value={f.subjects[0] ?? ""} onChange={(e) => setF({ ...f, subjects: e.target.value ? [e.target.value] : [], topics: [] })}>
                <option value="">Choose a subject…</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div className="col-span-6">
              <span className="label">Covers</span>
              <div role="radiogroup" aria-label="Test scope" className="mb-2 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[.03]">
                {([[true, "Whole subject"], [false, "Specific topics"]] as const).map(([v, l]) => (
                  <button key={l} type="button" role="radio" aria-checked={f.whole === v} onClick={() => set("whole", v)} className={`cursor-pointer rounded-lg py-1 text-sm ${f.whole === v ? "bg-teal-500 text-white" : "text-slate-500"}`}>{l}</button>
                ))}
              </div>
              <TopicInput topics={f.topics} onChange={(t) => set("topics", t)} suggestions={topicSuggestions} disabled={f.whole} />
            </div>
          </>
        )}

        <Field label={kind === "test" ? "Source (optional)" : "Source"} className="col-span-3"><input className="input" placeholder={kind === "test" ? "Book / site" : ""} value={f.source} onChange={(e) => set("source", e.target.value)} /></Field>
        <Field label="Date" className="col-span-3"><input className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="Marks" className="col-span-2"><input className="input" type="number" step="any" value={f.score} onChange={(e) => set("score", e.target.value)} /></Field>
        <Field label="Out of" className="col-span-2"><input className="input" type="number" value={f.maxScore} onChange={(e) => set("maxScore", e.target.value)} /></Field>
        <Field label="Time (hours.min)" className="col-span-2"><HoursInput minutes={f.timeMin} onChange={(v) => set("timeMin", v)} /></Field>
        <Field label="Correct" className="col-span-2"><input className="input" type="number" min={0} value={f.correct} onChange={(e) => set("correct", e.target.value)} /></Field>
        <Field label="Wrong" className="col-span-2"><input className="input" type="number" min={0} value={f.wrong} onChange={(e) => set("wrong", e.target.value)} /></Field>
        <Field label="Skipped" className="col-span-2"><input className="input" type="number" min={0} value={f.skipped} onChange={(e) => set("skipped", e.target.value)} /></Field>

        {kind !== "test" && (
          <div className="col-span-6">
            <span className="label">Weak subjects</span>
            <div className="flex flex-wrap gap-1.5">
              {(kind === "custom" ? f.subjects : subjects).map((s) => <button key={s} type="button" aria-pressed={f.weak.includes(s)} onClick={() => set("weak", toggle(f.weak, s))} className={pill(f.weak.includes(s), "border-rose-500 bg-rose-500")}>{s}</button>)}
              {kind === "custom" && !f.subjects.length && <span className="text-xs text-slate-400">Pick the subjects covered first.</span>}
            </div>
          </div>
        )}

        {err && <div role="alert" className="col-span-6 text-sm text-rose-600">{err}</div>}
        <div className="col-span-6 flex gap-2">
          <button type="submit" className="btn flex-1">{editing ? "Save changes" : `Add ${meta.noun} & log mistakes →`}</button>
          {editing && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
        </div>
      </div>
    </form>
  );
}

/** % over time for one kind, with the average as a guide line. */
export function TrendChart({ data, color, title }: { data: { date: string; label: string; pct: number }[]; color: string; title: string }) {
  const avg = avgOf(data.map((d) => d.pct));
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
          <XAxis dataKey="date" fontSize={11} tickLine={false} tickFormatter={(d) => formatDate(d)} />
          <YAxis domain={[0, 100]} fontSize={11} tickLine={false} unit="%" />
          <Tooltip formatter={(v) => [`${v}%`, "Score"]} labelFormatter={(d, p) => `${p?.[0]?.payload?.label ?? ""} · ${formatDate(String(d))}`} />
          {data.length > 1 && <ReferenceLine y={avg} stroke={color} strokeDasharray="4 4" strokeOpacity={0.5} />}
          <Line dataKey="pct" stroke={color} strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars of 0–100 %, as plain markup so labels never get clipped. */
export function PctBars({ title, rows, color, empty }: { title: string; rows: { label: string; pct: number; note?: string }[]; color: string; empty: string }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      {rows.length ? (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm"><span className="truncate text-slate-800 dark:text-slate-100">{r.label}</span><span className="shrink-0 tabular-nums text-slate-500">{r.pct}%{r.note && <span className="ml-1 text-xs text-slate-400">{r.note}</span>}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="img" aria-label={`${r.label}: ${r.pct}%`}><div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: color }} /></div>
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-center text-sm text-slate-400">{empty}</p>}
    </div>
  );
}

type TableProps = { kind: Kind; mocks: MockAttempt[]; mistakes: Mistake[]; onEdit: (m: MockAttempt) => void; onDelete: (m: MockAttempt) => void };

export function AttemptTable({ kind, mocks, mistakes, onEdit, onDelete }: TableProps) {
  const meta = KIND_META[kind];
  const cols = 9 + (kind === "full" ? 0 : kind === "custom" ? 1 : 2);
  return (
    <div className="sheet-wrap">
      <table className="sheet">
        <thead>
          <tr>
            <th>Date</th><th>{kind === "test" ? "Test" : "Mock"}</th>
            {kind === "custom" && <th>Covers</th>}
            {kind === "test" && <><th>Subject</th><th>Scope</th></>}
            <th className="text-right">Marks</th><th className="text-right">%</th><th className="text-right">✓</th><th className="text-right">✗</th><th className="text-right">Skip</th><th className="text-right">Time</th><th className="text-right">Rows logged</th><th />
          </tr>
        </thead>
        <tbody>
          {mocks.map((m) => {
            const rows = mistakes.filter((x) => x.mockId === m.id);
            const wrong = m.wrong ?? rows.filter((r) => (r.result ?? "wrong") === "wrong").length;
            const skipped = m.skipped ?? rows.filter((r) => r.result === "skipped").length;
            return (
              <tr key={m.id}>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{formatDate(m.date)}</td>
                <td className="px-3 py-2.5"><Link to={`/mocks/${m.id}`} className="font-medium text-brand-600 hover:underline">{m.name}</Link>{m.source && <div className="text-xs text-slate-400">{m.source}</div>}</td>
                {kind === "custom" && <td className="px-3 py-2.5"><div className="flex max-w-56 flex-wrap gap-1">{m.subjects?.map((s) => <span key={s} className="chip bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200">{s}</span>)}</div></td>}
                {kind === "test" && (
                  <>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{m.subjects?.[0] ?? "–"}</td>
                    <td className="px-3 py-2.5">{m.wholeSubject || !m.topics?.length ? <span className="chip bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200">Whole subject</span> : <div className="flex max-w-56 flex-wrap gap-1">{m.topics.map((t) => <span key={t} className="chip bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">{t}</span>)}</div>}</td>
                  </>
                )}
                <td className="px-3 py-2.5 text-right">{m.score}/{m.maxScore}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{pct(m)}%</td>
                <td className="px-3 py-2.5 text-right text-emerald-600">{m.correct ?? "–"}</td>
                <td className="px-3 py-2.5 text-right text-rose-600">{wrong || "–"}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{skipped || "–"}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{m.timeMin ? fmtDur(m.timeMin) : "–"}</td>
                <td className="px-3 py-2.5 text-right">{rows.length ? <Link to={`/mocks/${m.id}`} className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{rows.length}</Link> : <Link to={`/mocks/${m.id}`} className="text-xs text-slate-400 hover:text-brand-600">add</Link>}</td>
                <td className="whitespace-nowrap px-1 text-right">
                  <button className="icon-btn hover:!text-brand-600" aria-label={`Edit ${m.name}`} onClick={() => onEdit(m)}><Pencil size={14} /></button>
                  <button className="icon-btn" aria-label={`Delete ${m.name}`} onClick={() => onDelete(m)}><Trash2 size={15} /></button>
                </td>
              </tr>
            );
          })}
          {!mocks.length && <tr><td colSpan={cols + 1} className="py-10 text-center text-sm text-slate-400">No {meta.plural.toLowerCase()} logged yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
