import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "../../lib/dates";
import type { MockAttempt } from "../../lib/types";
import { avgOf, KIND_META, PctBars, pct, Stat, TrendChart } from "./shared";

const byDate = (xs: MockAttempt[]) => [...xs].sort((a, b) => a.date.localeCompare(b.date));
const trendOf = (xs: MockAttempt[]) => byDate(xs).map((m) => ({ date: m.date, label: m.name, pct: pct(m) }));

/** Full mocks: overall score, trajectory, question outcomes, and which subjects keep being weak. */
export function FullAnalytics({ mocks, subjects }: { mocks: MockAttempt[]; subjects: string[] }) {
  const sorted = byDate(mocks);
  const ps = sorted.map(pct);
  const latest = ps[ps.length - 1];
  const delta = ps.length > 1 ? latest - ps[ps.length - 2] : null;
  const outcome = sorted.filter((m) => m.correct !== undefined || m.wrong !== undefined).slice(-8)
    .map((m) => ({ name: formatDate(m.date), Correct: m.correct ?? 0, Wrong: m.wrong ?? 0, Skipped: m.skipped ?? 0 }));
  const weak = subjects.map((s) => ({ label: s, count: mocks.filter((m) => m.weakSubjects.includes(s)).length })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
  const top = weak[0]?.count ?? 1;
  return (
    <div className="min-w-0 space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Mocks taken" value={mocks.length} />
        <Stat label="Average" value={`${avgOf(ps)}%`} />
        <Stat label="Best" value={`${ps.length ? Math.max(...ps) : 0}%`} />
        <Stat label="Latest" value={ps.length ? `${latest}%` : "–"} hint={delta === null ? undefined : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} vs previous`} />
      </div>
      {mocks.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <TrendChart title="Score trend" data={trendOf(mocks)} color={KIND_META.full.color} />
          <div className="card">
            <div className="card-title">Question outcome · last {outcome.length || 8}</div>
            {outcome.length ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={outcome}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" /><XAxis dataKey="name" fontSize={11} tickLine={false} /><YAxis fontSize={11} tickLine={false} allowDecimals={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Correct" stackId="a" fill="#10b981" /><Bar dataKey="Wrong" stackId="a" fill="#f43f5e" /><Bar dataKey="Skipped" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Add correct / wrong counts to see this.</p>}
          </div>
          <div className="lg:col-span-2">
            <PctBars title="Weak subjects · how often tagged" color="#f43f5e" empty="Tag weak subjects when logging a mock."
              rows={weak.map((w) => ({ label: w.label, pct: Math.round((w.count / top) * 100), note: `${w.count}×` }))} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Custom mocks: how each subject performs inside these mixed papers. */
export function CustomAnalytics({ mocks, subjects }: { mocks: MockAttempt[]; subjects: string[] }) {
  const ps = mocks.map(pct);
  const per = subjects.map((s) => {
    const xs = mocks.filter((m) => m.subjects?.includes(s));
    return { label: s, n: xs.length, pct: avgOf(xs.map(pct)) };
  }).filter((x) => x.n > 0);
  const weakest = [...per].sort((a, b) => a.pct - b.pct);
  const covered = per.length;
  const avgSubjects = mocks.length ? (mocks.reduce((a, m) => a + (m.subjects?.length ?? 0), 0) / mocks.length).toFixed(1) : "0";
  return (
    <div className="min-w-0 space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Custom mocks" value={mocks.length} />
        <Stat label="Average" value={`${avgOf(ps)}%`} />
        <Stat label="Best" value={`${ps.length ? Math.max(...ps) : 0}%`} />
        <Stat label="Subjects covered" value={covered} hint={`~${avgSubjects} per mock`} />
      </div>
      {mocks.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <TrendChart title="Score trend" data={trendOf(mocks)} color={KIND_META.custom.color} />
          <PctBars title="Average by subject · weakest first" color={KIND_META.custom.color} empty="Log a custom mock to see subjects."
            rows={weakest.map((x) => ({ label: x.label, pct: x.pct, note: `${x.n} mock${x.n > 1 ? "s" : ""}` }))} />
        </div>
      )}
    </div>
  );
}

/** Subject tests: pick a subject and see its trend plus topic-by-topic strength. */
export function TestAnalytics({ mocks }: { mocks: MockAttempt[] }) {
  const [subject, setSubject] = useState("all");
  const tested = [...new Set(mocks.map((m) => m.subjects?.[0]).filter(Boolean) as string[])].sort();
  const sel = tested.includes(subject) ? subject : "all";
  const scope = sel === "all" ? mocks : mocks.filter((m) => m.subjects?.[0] === sel);
  const ps = scope.map(pct);
  const bySubject = tested.map((s) => {
    const xs = mocks.filter((m) => m.subjects?.[0] === s);
    return { label: s, pct: avgOf(xs.map(pct)), note: `${xs.length} test${xs.length > 1 ? "s" : ""}` };
  }).sort((a, b) => a.pct - b.pct);
  // topic strength within one subject; whole-subject tests count under "Whole subject"
  const topicMap = new Map<string, number[]>();
  if (sel !== "all") for (const m of scope) {
    const keys = m.wholeSubject || !m.topics?.length ? ["Whole subject"] : m.topics;
    for (const k of keys) topicMap.set(k, [...(topicMap.get(k) ?? []), pct(m)]);
  }
  const topics = [...topicMap].map(([label, xs]) => ({ label, pct: avgOf(xs), note: `${xs.length}×` })).sort((a, b) => a.pct - b.pct);
  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">Subject
          <select className="input !w-auto" value={sel} onChange={(e) => setSubject(e.target.value)} disabled={!tested.length}>
            <option value="all">All subjects</option>
            {tested.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tests taken" value={scope.length} />
        <Stat label="Average" value={`${avgOf(ps)}%`} />
        <Stat label="Best" value={`${ps.length ? Math.max(...ps) : 0}%`} />
        <Stat label={sel === "all" ? "Subjects tested" : "Topics tested"} value={sel === "all" ? tested.length : topics.filter((t) => t.label !== "Whole subject").length} />
      </div>
      {mocks.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <TrendChart title={sel === "all" ? "Score trend · all tests" : `Score trend · ${sel}`} data={trendOf(scope)} color={KIND_META.test.color} />
          {sel === "all"
            ? <PctBars title="Average by subject · weakest first" color={KIND_META.test.color} empty="" rows={bySubject} />
            : <PctBars title={`Topics in ${sel} · weakest first`} color={KIND_META.test.color} empty="No topics yet." rows={topics} />}
        </div>
      )}
    </div>
  );
}
