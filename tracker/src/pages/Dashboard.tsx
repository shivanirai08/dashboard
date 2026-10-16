import { useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, CheckCircle2, Clock, Flame, ListTodo, RotateCcw, Target, TriangleAlert, Trophy } from "lucide-react";
import { useStore } from "../lib/store";
import { formatClock, usePomodoro } from "../lib/pomodoro";
import TimerControls from "../components/TimerControls";
import { uid } from "../lib/ids";
import { addDays, daysUntil, formatDate, isSameDay, todayISO } from "../lib/dates";
import { Empty, PageHeader } from "../components/ui";
import { REASONS, REASON_KEYS } from "../lib/reasons";

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

  const weekStart = addDays(today, -6);
  const prevStart = addDays(today, -13);
  const inRange = (iso: string | undefined, from: string, to: string) => {
    if (!iso) return false;
    const d = iso.length > 10 ? new Date(iso).toLocaleDateString("sv-SE") : iso;
    return d >= from && d <= to;
  };
  const weekSessions = focus.filter((x) => inRange(x.startedAt, weekStart, today));
  const weekMin = weekSessions.reduce((a, x) => a + x.minutes, 0);
  const prevMin = focus.filter((x) => inRange(x.startedAt, prevStart, addDays(today, -7))).reduce((a, x) => a + x.minutes, 0);
  const weekMocks = state.mocks.filter((m) => inRange(m.date, weekStart, today));
  const weekMockAvg = weekMocks.length ? Math.round(weekMocks.reduce((a, m) => a + (m.score / m.maxScore) * 100, 0) / weekMocks.length) : null;
  const diff = weekMin - prevMin;
  const week: [string, string | number, string?][] = [
    ["Focus time", `${(weekMin / 60).toFixed(1)}h`, prevMin || weekMin ? `${diff >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(diff / 6) / 10)}h vs last week` : undefined],
    ["Tasks done", state.todos.filter((t) => t.status === "done" && inRange(t.doneAt, weekStart, today)).length],
    ["Mocks", weekMocks.length, weekMockAvg !== null ? `avg ${weekMockAvg}%` : undefined],
    ["Mistakes logged", state.mistakes.filter((m) => inRange(m.date, weekStart, today)).length],
  ];
  const bySubject = Object.entries(weekSessions.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.subject ?? "Unspecified"]: (acc[x.subject ?? "Unspecified"] ?? 0) + x.minutes }), {}))
    .map(([subject, min]) => ({ subject, min }))
    .sort((a, b) => b.min - a.min);

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
    { label: "Focus today", value: `${todayMin}m`, to: "/focus", tone: "from-indigo-500 to-violet-500", icon: Clock },
    { label: "Revisions due", value: dueRev.length, to: "/revision", tone: "from-amber-500 to-orange-500", icon: RotateCcw },
    { label: "Open mistakes", value: openMistakes, to: "/mistakes", tone: "from-rose-500 to-pink-500", icon: TriangleAlert },
    { label: "Mocks taken", value: state.mocks.length, to: "/mocks", tone: "from-emerald-500 to-teal-500", icon: Trophy },
  ];

  const topReasons = REASON_KEYS.map((k) => ({ k, n: state.mistakes.filter((m) => m.kind === k).length })).filter((x) => x.n).sort((x, y) => y.n - x.n);
  const maxReason = topReasons[0]?.n ?? 1;

  return (
    <>
      <PageHeader title={`Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}`} sub={left !== null ? `${left} days to ${catalog.target}` : `Preparing for ${catalog.target} · set your exam date in Settings`} />

      <div className="space-y-5">
        <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((t) => (
              <Link key={t.label} to={t.to} className="card group relative overflow-hidden !p-4 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-4 focus-visible:ring-brand-500/30">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.tone}`} />
                <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{t.label}</span><t.icon size={16} className="text-slate-300 transition-colors group-hover:text-brand-500 dark:text-slate-600" aria-hidden /></div>
                <div className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{t.value}</div>
              </Link>
            ))}
          </div>

          <div className="grid flex-1 gap-5 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div className="card-title !mb-0">Focus minutes · last 14 days</div>
                <span className="chip bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"><Flame size={12} className="mr-1" />{streak}-day streak</span>
              </div>
              <ResponsiveContainer width="100%" height={190}>
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
                <Link to={`/mocks/${lastMock.id}`} className="block">
                  <div className="text-4xl font-bold tabular-nums text-slate-900 dark:text-white">{Math.round((lastMock.score / lastMock.maxScore) * 100)}%</div>
                  <div className="mt-1 text-sm text-brand-600">{lastMock.name} →</div>
                  <div className="text-xs text-slate-500">{formatDate(lastMock.date)} · {lastMock.score}/{lastMock.maxScore}</div>
                  {lastMock.weakSubjects.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{lastMock.weakSubjects.map((s) => <span key={s} className="chip bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{s}</span>)}</div>}
                </Link>
              ) : <Empty icon={<Target />} text="No mock logged yet" />}
            </div>
          </div>

          </div>
          <div className="space-y-5">
            <FocusNow />
            <QuickAdd />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="card">
              <div className="card-title flex items-center gap-2"><CalendarRange size={15} /> This week</div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {week.map(([l, v, sub]) => (
                  <div key={l}><dt className="text-xs text-slate-500">{l}</dt><dd className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{v}</dd>{sub && <dd className="text-xs text-slate-400">{sub}</dd>}</div>
                ))}
              </dl>
            </div>

            <div className="card">
              <div className="card-title">Time by subject · 7 days</div>
              {bySubject.length ? (
                <ResponsiveContainer width="100%" height={Math.max(130, bySubject.length * 30)}>
                  <BarChart data={bySubject} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="subject" width={110} fontSize={11} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: "rgba(99,102,241,.08)" }} formatter={(v) => [`${v} min`, "Focus"]} /><Bar dataKey="min" fill="#8b5cf6" radius={[0, 6, 6, 0]} /></BarChart>
                </ResponsiveContainer>
              ) : <Empty icon={<Target />} text="Pick a subject when you start a session" />}
            </div>

            <div className="card">
              <div className="card-title flex items-center justify-between">Why I lose marks <Link to="/mistakes" className="text-xs font-normal text-brand-600">open log →</Link></div>
              {topReasons.length ? (
                <div className="space-y-2.5">
                  {topReasons.map(({ k, n }) => (
                    <div key={k}>
                      <div className="mb-1 flex justify-between text-xs"><span>{REASONS[k].label}</span><span className="tabular-nums text-slate-500">{n}</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full" style={{ width: `${(n / maxReason) * 100}%`, background: REASONS[k].bar }} /></div>
                    </div>
                  ))}
                </div>
              ) : <Empty icon={<Target />} text="Log mistakes to see patterns" />}
            </div>
          </div>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="card">
            <div className="card-title flex items-center justify-between"><span className="flex items-center gap-2"><RotateCcw size={15} aria-hidden /> Revise today</span> <span className="text-xs font-normal text-slate-400">{dueRev.length} due</span></div>
            {dueRev.length ? dueRev.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center gap-2 border-b border-slate-100 py-2.5 text-sm last:border-0 dark:border-white/5"><span className="min-w-0 flex-1 truncate">{r.topic}<span className="ml-2 text-xs text-slate-500">{r.subject}</span></span><button className="chip min-h-8 cursor-pointer bg-emerald-100 px-3 text-emerald-700 transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-300" aria-label={`Mark ${r.topic} revised`} onClick={() => markRevised(r.id)}>Done</button></div>
            )) : <Empty icon={<CheckCircle2 />} text="Nothing due today" />}
          </div>
          <div className="card">
            <div className="card-title flex items-center justify-between"><span className="flex items-center gap-2"><ListTodo size={15} aria-hidden /> Pending tasks</span> <Link to="/focus" className="text-xs font-normal text-brand-600">board →</Link></div>
            {todos.length ? todos.slice(0, 8).map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0 dark:border-white/5">
                <input type="checkbox" aria-label={`Complete ${t.title}`} className="size-4 cursor-pointer accent-indigo-600" onChange={() => setState((s) => ({ ...s, todos: s.todos.map((x) => (x.id === t.id ? { ...x, status: "done" as const, doneAt: today } : x)) }))} />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>{t.due && <span className={`text-xs ${t.due < today ? "text-rose-500" : "text-slate-400"}`}>{formatDate(t.due)}</span>}
              </label>
            )) : <Empty icon={<CheckCircle2 />} text="No pending tasks" />}
          </div>
        </div>
      </div>
    </>
  );
}

function FocusNow() {
  const p = usePomodoro();
  const { state, catalog } = useStore();
  const goal = state.dailyGoalMin ?? 240;
  const today = state.pomodoros.filter((x) => x.kind === "focus" && isSameDay(x.startedAt)).reduce((a, x) => a + x.minutes, 0);
  const pct = Math.min(100, Math.round((today / goal) * 100));
  return (
    <div className="card">
      <div className="card-title">Focus now</div>
      <div className="flex items-center gap-4">
        <div className="font-mono text-4xl font-bold text-slate-900 dark:text-white">{formatClock(p.remaining)}</div>
        <TimerControls />
      </div>
      <div className="mt-3 inline-flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-white/10">
        {([["pomodoro", "Pomodoro"], ["open", "Open"]] as const).map(([m, l]) => (
          <button key={m} onClick={() => p.setMode(m)} aria-pressed={p.mode === m} className={`cursor-pointer rounded-md px-3 py-1 transition-colors ${p.mode === m ? "bg-brand-500 text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input aria-label="What are you working on" className="input min-w-0 flex-1" placeholder="Working on…" value={p.label} onChange={(e) => p.setLabel(e.target.value)} />
        <select aria-label="Subject" className="input !w-36" value={p.subject} onChange={(e) => p.setSubject(e.target.value)}>
          <option value="">Subject</option>{catalog.subjects.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Daily goal</span><span>{today} / {goal} min</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all" style={{ width: `${pct}%` }} /></div>
      </div>
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
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center gap-1">
        <div className="card-title !mb-0 mr-1">Add</div>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-sm transition-colors ${tab === k ? "bg-brand-500 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"}`}>{l}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(tab === "mistake" || tab === "revision") && (
          <select aria-label="Subject" className="input !w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}>{catalog.subjects.map((x) => <option key={x}>{x}</option>)}</select>
        )}
        <input id="quick-add-input" aria-label={ph} className="input min-w-0 flex-1" placeholder={ph} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {tab === "mock" && (
          <>
            <input aria-label="Score" className="input !w-20" type="number" placeholder="Score" value={score} onChange={(e) => setScore(e.target.value)} />
            <input aria-label="Max score" className="input !w-20" type="number" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} />
          </>
        )}
        <button className="btn" onClick={submit}>Add</button>
      </div>
    </div>
  );
}
