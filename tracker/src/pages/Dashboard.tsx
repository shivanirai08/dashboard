import { useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CheckCircle2, ExternalLink, Flame, Pause, Play, Target } from "lucide-react";
import { useStore } from "../lib/store";
import { formatClock, usePomodoro } from "../lib/pomodoro";
import { uid } from "../lib/ids";
import { addDays, daysUntil, formatDate, isSameDay, todayISO } from "../lib/dates";
import { Empty, PageHeader } from "../components/ui";

export default function Dashboard() {
  const { state, catalog, setState } = useStore();
  const today = todayISO();
  const focus = state.pomodoros.filter((x) => x.kind === "focus");
  const todayMin = focus.filter((x) => isSameDay(x.startedAt)).reduce((a, x) => a + x.minutes, 0);

  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const series = days.map((d) => ({
    day: new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    min: focus.filter((x) => isSameDay(x.startedAt, d)).reduce((a, x) => a + x.minutes, 0),
  }));
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (series[i].min > 0) streak++;
    else if (i !== days.length - 1) break;
  }

  const dueRev = state.revisions.filter((r) => daysUntil(r.nextDue) <= 0);
  const todos = state.todos.filter((t) => t.status !== "done");
  const openMistakes = state.mistakes.filter((m) => !m.resolved).length;
  const lastMock = [...state.mocks].sort((a, b) => b.date.localeCompare(a.date))[0];
  const left = state.examDate ? daysUntil(state.examDate) : null;
  const hour = new Date().getHours();
  const markRevised = (id: string) =>
    setState((p) => ({
      ...p,
      revisions: p.revisions.map((r) => {
        if (r.id !== id) return r;
        const i = r.intervalDays < 1 ? 1 : r.intervalDays < 3 ? 3 : r.intervalDays < 7 ? 7 : r.intervalDays < 14 ? 14 : r.intervalDays < 30 ? 30 : 60;
        return { ...r, lastReviewed: today, intervalDays: i, nextDue: addDays(today, i) };
      }),
    }));

  const tiles = [
    { label: "Focus today", value: `${todayMin}m`, to: "/focus", tone: "from-indigo-500 to-violet-500" },
    { label: "Revisions due", value: dueRev.length, to: "/revision", tone: "from-amber-500 to-orange-500" },
    { label: "Open mistakes", value: openMistakes, to: "/mistakes", tone: "from-rose-500 to-pink-500" },
    { label: "Mocks taken", value: state.mocks.length, to: "/mocks", tone: "from-emerald-500 to-teal-500" },
  ];

  return (
    <>
      <PageHeader title={`Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"} 👋`} sub={left !== null ? `${left} days to ${catalog.target}` : `Preparing for ${catalog.target} · set your exam date in Settings`}>
        <a className="btn-ghost" href={catalog.hubs.gateqaPyq} target="_blank" rel="noreferrer">GateQA PYQs <ExternalLink size={13} /></a>
        <a className="btn" href={catalog.hubs.gateqaMocks} target="_blank" rel="noreferrer">Custom mock <ExternalLink size={13} /></a>
        <a className="btn-ghost" href={catalog.hubs.gateoverflow} target="_blank" rel="noreferrer">GateOverflow <ExternalLink size={13} /></a>
      </PageHeader>

      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <FocusNow />
        <QuickAdd />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="card group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.tone}`} />
            <div className="text-xs font-medium text-slate-500">{t.label}</div>
            <div className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{t.value}</div>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="card-title !mb-0">Focus minutes · last 14 days</div>
            <span className="chip bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"><Flame size={12} className="mr-1" />{streak}-day streak</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={series}>
              <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} interval={1} />
              <Tooltip cursor={{ fill: "rgba(99,102,241,.08)" }} />
              <Bar dataKey="min" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title flex items-center gap-2"><Target size={15} /> Latest mock</div>
          {lastMock ? (
            <>
              <div className="text-4xl font-bold text-slate-900 dark:text-white">{Math.round((lastMock.score / lastMock.maxScore) * 100)}%</div>
              <div className="mt-1 text-sm">{lastMock.name}</div>
              <div className="text-xs text-slate-500">{formatDate(lastMock.date)} · {lastMock.score}/{lastMock.maxScore}</div>
              {lastMock.weakSubjects.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{lastMock.weakSubjects.map((s) => <span key={s} className="chip bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{s}</span>)}</div>}
            </>
          ) : <Empty icon={<Target />} text="No mock logged yet" />}
        </div>

        <div className="card">
          <div className="card-title">Revise today</div>
          {dueRev.length ? dueRev.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center gap-2 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5"><span className="min-w-0 flex-1 truncate">{r.topic}<span className="ml-2 text-xs text-slate-500">{r.subject}</span></span><button className="chip cursor-pointer bg-emerald-100 text-emerald-700 hover:brightness-95 dark:bg-emerald-500/15 dark:text-emerald-300" onClick={() => markRevised(r.id)}>Done</button></div>
          )) : <Empty icon={<CheckCircle2 />} text="Nothing due 🎉" />}
        </div>

        <div className="card lg:col-span-2">
          <div className="card-title">Pending tasks</div>
          {todos.length ? todos.slice(0, 6).map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5">
              <input type="checkbox" className="size-4 accent-indigo-600" onChange={() => setState((s) => ({ ...s, todos: s.todos.map((x) => (x.id === t.id ? { ...x, status: "done" as const, doneAt: today } : x)) }))} />
              {t.title}{t.due && <span className={`ml-auto text-xs ${t.due < today ? "text-rose-500" : "text-slate-400"}`}>{formatDate(t.due)}</span>}
            </label>
          )) : <Empty icon={<CheckCircle2 />} text="No pending tasks" />}
        </div>
      </div>
    </>
  );
}

function FocusNow() {
  const p = usePomodoro();
  return (
    <div className="card lg:col-span-2">
      <div className="card-title">Focus now</div>
      <div className="flex items-center gap-4">
        <div className="font-mono text-4xl font-bold text-slate-900 dark:text-white">{formatClock(p.remaining)}</div>
        <button className="btn" onClick={p.running ? p.pause : p.start}>{p.running ? <><Pause size={15} />Pause</> : <><Play size={15} />Start</>}</button>
        {p.mode === "open" && <button className="btn-ghost" onClick={p.finish} disabled={p.remaining < 30}>Done &amp; log</button>}
        <span className="text-xs uppercase tracking-wider text-slate-400">{p.mode === "open" ? "open" : p.phase}</span>
      </div>
      <div className="mt-3 inline-flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-white/10">
        {([["pomodoro", "Pomodoro"], ["open", "Open"]] as const).map(([m, l]) => (
          <button key={m} onClick={() => p.setMode(m)} className={`cursor-pointer rounded-md px-3 py-0.5 ${p.mode === m ? "bg-brand-500 text-white" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>
      <input className="input mt-3" placeholder="What are you working on?" value={p.label} onChange={(e) => p.setLabel(e.target.value)} />
    </div>
  );
}

type Tab = "task" | "mistake" | "revision" | "mock";

function QuickAdd() {
  const { catalog, setState } = useStore();
  const [tab, setTab] = useState<Tab>("task");
  const [text, setText] = useState("");
  const [subject, setSubject] = useState(catalog.subjects[0]);
  const [score, setScore] = useState("");
  const [max, setMax] = useState("100");
  const today = todayISO();

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    if (tab === "task") setState((s) => ({ ...s, todos: [{ id: uid(), title: t, status: "todo", createdAt: today }, ...s.todos] }));
    if (tab === "mistake") setState((s) => ({ ...s, mistakes: [{ id: uid(), date: today, subject, topic: "", kind: "concept", question: t, fix: "", resolved: false }, ...s.mistakes] }));
    if (tab === "revision") setState((s) => ({ ...s, revisions: [...s.revisions, { id: uid(), subject, topic: t, notes: "", lastReviewed: today, nextDue: addDays(today, 1), intervalDays: 1 }] }));
    if (tab === "mock") {
      if (score === "") return;
      setState((s) => ({ ...s, mocks: [{ id: uid(), name: t, source: "GateQA", type: "full", date: today, score: Number(score), maxScore: Number(max) || 100, weakSubjects: [], notes: "" }, ...s.mocks] }));
      setScore("");
    }
    setText("");
  };

  const tabs: [Tab, string][] = [["task", "Task"], ["mistake", "Mistake"], ["revision", "Revision"], ["mock", "Mock"]];
  const ph = { task: "Add a task…", mistake: "What did you get wrong?", revision: "Topic you just studied…", mock: "Mock name…" }[tab];

  return (
    <div className="card lg:col-span-3">
      <div className="mb-3 flex items-center gap-1">
        <div className="card-title !mb-0 mr-2">Quick add</div>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`cursor-pointer rounded-lg px-3 py-1 text-sm ${tab === k ? "bg-brand-500 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"}`}>{l}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(tab === "mistake" || tab === "revision") && (
          <select className="input !w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}>{catalog.subjects.map((x) => <option key={x}>{x}</option>)}</select>
        )}
        <input className="input min-w-0 flex-1" placeholder={ph} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {tab === "mock" && (
          <>
            <input className="input !w-20" type="number" placeholder="Score" value={score} onChange={(e) => setScore(e.target.value)} />
            <input className="input !w-20" type="number" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} />
          </>
        )}
        <button className="btn" onClick={submit}>Add</button>
      </div>
    </div>
  );
}
