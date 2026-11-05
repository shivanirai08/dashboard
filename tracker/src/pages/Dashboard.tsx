import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CheckCircle2, ChevronLeft, ChevronRight, Flame, ListTodo, Plus, RotateCcw, Target } from "lucide-react";
import { useStore } from "../lib/store";
import { formatClock, usePomodoro } from "../lib/pomodoro";
import TimerControls from "../components/TimerControls";
import PlayButton from "../components/PlayButton";
import { uid } from "../lib/ids";
import { goalOn } from "../lib/goals";
import { addDays, dayOf, daysUntil, formatDate, isSameDay, todayISO } from "../lib/dates";
import { Empty, HoursInput, PageHeader } from "../components/ui";
import { REASONS, REASON_KEYS } from "../lib/reasons";
import { useTasks } from "../lib/useTasks";
import { columnOf, dayCounter, phaseOf, plannedMin, startOf, tasksOn } from "../lib/tasks";
import { clock12, fmtDur, toMin } from "../lib/schedule";
import type { TodoItem } from "../lib/types";

export default function Dashboard() {
  const { state, catalog } = useStore();
  const today = todayISO();
  const focus = state.pomodoros.filter((x) => x.kind === "focus");
  const todayMin = focus.filter((x) => isSameDay(x.startedAt)).reduce((a, x) => a + x.minutes, 0);
  const goal = goalOn(state, today);
  const [chartView, setChartView] = useState<"heat" | "bars">("heat");
  const [barPage, setBarPage] = useState(0);   // 0 = latest 14 days, 1 = the 14 before, ...
  const [heatPage, setHeatPage] = useState(0); // 0 = latest weeks, 1 = the page before, ...
  const [heatWeeks, setHeatWeeks] = useState(26);
  const heatRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; date: string; min: number; g: number } | null>(null);
  // as many week columns as fit the container, so the heatmap always spans its full width
  useEffect(() => {
    const el = heatRef.current;
    if (!el || chartView !== "heat") return;
    const fit = () => setHeatWeeks(Math.max(8, Math.floor((el.clientWidth + 3) / 17)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chartView]);

  const BAR_DAYS = 14;
  const barEnd = addDays(today, -BAR_DAYS * barPage);
  const days = Array.from({ length: BAR_DAYS }, (_, i) => addDays(barEnd, i - (BAR_DAYS - 1)));
  const series = days.map((d) => ({
    day: new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    min: focus.filter((x) => isSameDay(x.startedAt, d)).reduce((a, x) => a + x.minutes, 0),
  }));
  // uncapped streaks: walk back from today over per-day focus totals.
  // today is forgiven while it's still in progress (doesn't break the streak).
  const minByDay = new Map<string, number>();
  for (const x of focus) {
    const d = dayOf(x.startedAt);
    minByDay.set(d, (minByDay.get(d) ?? 0) + x.minutes);
  }
  // each day is judged against its own goal; rest days (goal 0) are skipped, not counted as misses
  const firstDay = [...minByDay.keys()].sort()[0] ?? today;
  const streakOf = (kind: "show" | "goal") => {
    let n = 0;
    for (let d = today; d >= firstDay; d = addDays(d, -1)) {
      const min = minByDay.get(d) ?? 0;
      const g = goalOn(state, d);
      if (g === 0) { if (kind === "show" && min > 0) n++; continue; }
      if (kind === "show" ? min > 0 : min >= g) n++;
      else if (d !== today) break;
    }
    return n;
  };
  const showUpStreak = streakOf("show");
  const goalStreak = streakOf("goal");

  // heatmap: Monday-first week columns; page 0 ends with the current week
  const HEAT_WEEKS = heatWeeks;
  const todayIdx = (new Date(`${today}T12:00:00`).getDay() + 6) % 7;
  const heatStart = addDays(today, -todayIdx - 7 * (HEAT_WEEKS - 1) - 7 * HEAT_WEEKS * heatPage);
  // shade by absolute hours, whatever the day's goal: 0, <1h, 1h, 2h ... up to 10h+ (11 steps)
  const levelOf = (min: number) => (min <= 0 ? 0 : Math.min(11, 1 + Math.floor(min / 60)));
  // goal met (or a rest day) -> green ramp by hours; studied but under goal -> soft yellow (half or more) / soft red (less)
  const cellColor = (c: { min: number; g: number; level: number }) =>
    c.level === 0 ? undefined
    : c.g === 0 || c.min >= c.g ? heatColor(c.level)
    : c.min >= c.g / 2 ? "var(--heat-near)" : "var(--heat-miss)";
  // perceptual green ramp (oklch): lightness and chroma move evenly per hour, hue drifts slightly toward teal
  const heatColor = (level: number) => {
    const t = (level - 1) / 10;
    return `oklch(calc(var(--heat-l0) + (var(--heat-l1) - var(--heat-l0)) * ${t}) calc(var(--heat-c0) + (var(--heat-c1) - var(--heat-c0)) * ${Math.min(1, t * 2).toFixed(3)}) ${(152 - 6 * t).toFixed(1)})`;
  };
  const heat = Array.from({ length: HEAT_WEEKS * 7 }, (_, i) => {
    const date = addDays(heatStart, i);
    const min = minByDay.get(date) ?? 0;
    const g = goalOn(state, date);
    return { date, min, g, future: date > today, level: levelOf(min) };
  });
  const heatMonths = (() => {
    const raw = Array.from({ length: HEAT_WEEKS }, (_, w) => {
      const d = new Date(`${heat[w * 7].date}T12:00:00`);
      const prev = w > 0 ? new Date(`${heat[(w - 1) * 7].date}T12:00:00`) : null;
      return !prev || prev.getMonth() !== d.getMonth() ? d.toLocaleDateString("en-IN", { month: "short" }) : "";
    });
    // drop a label when the next month starts within 2 columns, so names never collide
    return raw.map((m, w) => (m && (raw[w + 1] || raw[w + 2]) ? "" : m));
  })();
  const heatDays = heat.filter((c) => !c.future);
  const heatShown = heatDays.filter((c) => c.level > 0).length;
  const HEAT0 = "bg-slate-100 dark:bg-white/[.06]";
  const fmtShort = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
  const heatLast = addDays(heatStart, HEAT_WEEKS * 7 - 1);
  const rangeLabel = chartView === "bars" ? `${fmtShort(days[0])} – ${fmtShort(days[days.length - 1])}` : `${fmtShort(heatStart)} – ${fmtShort(heatLast > today ? today : heatLast)}`;
  const page = chartView === "bars" ? barPage : heatPage;
  const setPage = chartView === "bars" ? setBarPage : setHeatPage;

  const dueRev = state.todos.filter((t) => t.revision && t.status !== "done" && (t.planned ?? today) <= today);
  const openMistakes = state.mistakes.filter((m) => !m.resolved).length;
  const mocksByDate = [...state.mocks].sort((a, b) => b.date.localeCompare(a.date));
  const lastMock = mocksByDate[0];
  const pct = (m: { score: number; maxScore: number }) => (m.maxScore ? Math.round((m.score / m.maxScore) * 100) : 0);
  const mockDelta = mocksByDate.length > 1 ? pct(mocksByDate[0]) - pct(mocksByDate[1]) : null;
  const recentMocks = mocksByDate.slice(0, 5);
  const left = state.examDate ? daysUntil(state.examDate) : null;
  const hour = new Date().getHours();
  const tiles: { label: string; value: string | number; sub?: string; to: string; dot: string; progress?: number }[] = [
    { label: "Focus today", value: fmtDur(todayMin), sub: goal ? `of ${fmtDur(goal)}` : "rest day", to: "/schedule", dot: "bg-brand-500" },
    { label: "Revisions due", value: dueRev.length, to: "/revision", dot: "bg-amber-500" },
    { label: "Open mistakes", value: openMistakes, to: "/mistakes", dot: "bg-rose-500" },
  ];

  const topReasons = REASON_KEYS.map((k) => ({ k, n: state.mistakes.filter((m) => m.kind === k).length })).filter((x) => x.n).sort((x, y) => y.n - x.n);
  const maxReason = topReasons[0]?.n ?? 1;

  return (
    <>
      <PageHeader title={left !== null ? `${left} day${left === 1 ? "" : "s"} to ${catalog.target}` : `Preparing for ${catalog.target}`} sub={`Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}${left === null ? " · set your exam date in Settings" : ""}`} />

      <div className="space-y-5">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-5 max-xl:contents">
            <div className="max-xl:order-1"><NowBand /></div>

            <div className="card grid grid-cols-3 max-xl:order-3 divide-x divide-slate-100 !p-0 dark:divide-white/[.06]">
              {tiles.map((t) => (
                <Link key={t.label} to={t.to} className={`block px-3 py-3.5 sm:px-4 transition hover:bg-slate-50 focus-visible:bg-slate-50 dark:hover:bg-white/[.03] `}>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><span className={`size-1.5 rounded-full ${t.dot}`} aria-hidden />{t.label}</div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2"><span className="whitespace-nowrap text-xl font-semibold tabular-nums tracking-tight sm:text-2xl text-slate-900 dark:text-white">{t.value}</span>{t.sub && <span className="hidden whitespace-nowrap text-xs sm:inline text-slate-500 dark:text-slate-400">{t.sub}</span>}</div>
                </Link>
              ))}
            </div>

            <div className="max-xl:order-4"><TodayPlan /></div>

            <div className="grid gap-5 max-xl:order-5 lg:grid-cols-2">
              <div className="card lg:col-span-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="chip bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" title="Consecutive days with any focus time"><Flame size={12} className="mr-1" />{showUpStreak}-day show-up</span>
                    <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" title="Consecutive days reaching that day’s goal (rest days are skipped)"><Target size={12} className="mr-1" />{goalStreak}-day goal</span>
                  </div>
                  <div role="tablist" aria-label="Focus chart" className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium dark:bg-white/[.06]">
                    {([["heat", "Heatmap"], ["bars", "Daily"]] as const).map(([k, label]) => (
                      <button key={k} role="tab" aria-selected={chartView === k} onClick={() => setChartView(k)}
                        className={`cursor-pointer rounded-md px-2.5 py-1 transition ${chartView === k ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>{label}</button>
                    ))}
                  </div>
                </div>

                <div className="mb-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <button onClick={() => setPage(page + 1)} aria-label="Earlier" className="cursor-pointer rounded-md p-1 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/[.06] dark:hover:text-slate-200"><ChevronLeft size={15} /></button>
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} aria-label="Later" className="cursor-pointer rounded-md p-1 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-white/[.06] dark:hover:text-slate-200"><ChevronRight size={15} /></button>
                  <span className="ml-1 tabular-nums">{rangeLabel}</span>
                  {page > 0 && <button onClick={() => setPage(0)} className="ml-2 cursor-pointer text-brand-600 hover:underline dark:text-brand-300">Back to today</button>}
                </div>

                <div className="min-h-[175px]">
                {chartView === "bars" ? (
                  series.some((x) => x.min > 0) ? (
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={series}>
                      <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} interval={1} />
                      <Tooltip cursor={{ fill: "rgba(99,102,241,.08)" }} formatter={(v) => [fmtDur(Number(v)), "Focus"]} />
                      <Bar dataKey="min" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  ) : <Empty icon={<Flame />} text="No focus time logged in these 14 days" />
                ) : (
                  <div>
                    <div className="flex gap-2" role="img" aria-label={`Focus heatmap: showed up ${heatShown} of the last ${heatDays.length} days`}>
                      <div className="grid grid-rows-7 gap-[3px] pt-[15px] text-[10px] leading-none text-slate-500 dark:text-slate-400" aria-hidden>
                        {["Mon", "", "Wed", "", "Fri", "", ""].map((l, i) => <span key={i} className="flex items-center">{l}</span>)}
                      </div>
                      <div ref={heatRef} className="relative min-w-0 flex-1" onMouseLeave={() => setTip(null)}>
                        <div className="mb-[3px] grid gap-[3px] text-[10px] leading-3 text-slate-500 dark:text-slate-400" style={{ gridTemplateColumns: `repeat(${HEAT_WEEKS}, minmax(0, 1fr))` }} aria-hidden>
                          {heatMonths.map((m, i) => <span key={i} className="whitespace-nowrap">{m}</span>)}
                        </div>
                        <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${HEAT_WEEKS}, minmax(0, 1fr))` }}>
                          {heat.map((c) => c.future ? <span key={c.date} /> : (
                            <span
                              key={c.date}
                              aria-label={`${formatDate(c.date)}: ${c.min ? fmtDur(c.min) : "no focus"}`}
                              onMouseEnter={(e) => {
                                const box = heatRef.current!.getBoundingClientRect();
                                const r = e.currentTarget.getBoundingClientRect();
                                setTip({ x: Math.min(Math.max(r.left - box.left + r.width / 2, 70), box.width - 70), y: r.top - box.top, date: c.date, min: c.min, g: c.g });
                              }}
                              style={c.level ? { backgroundColor: cellColor(c) } : undefined}
                              className={`aspect-square rounded-[3px] ${c.level ? "" : HEAT0} ${c.date === today ? "ring-1 ring-brand-500 ring-offset-1 ring-offset-white dark:ring-offset-panel" : ""}`}
                            />
                          ))}
                        </div>
                        {tip && (
                          <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-slate-700" style={{ left: tip.x, top: tip.y - 6 }}>
                            <div className="font-semibold tabular-nums">{tip.min ? fmtDur(tip.min) : tip.g === 0 ? "Rest day" : "No focus"}{tip.g > 0 && tip.min >= tip.g ? " · goal reached" : ""}</div>
                            <div className="text-slate-300">{formatDate(tip.date)}{tip.g > 0 ? ` · goal ${fmtDur(tip.g)}` : tip.min ? " · rest day" : ""}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">Less<span className={`size-2.5 rounded-[3px] ${HEAT0}`} />{[1, 2, 3, 4, 5, 7, 9, 11].map((l) => <span key={l} className="size-2.5 rounded-[3px]" style={{ backgroundColor: heatColor(l) }} />)}More<span className="ml-1">· goal met, 1h steps to 10h+</span></span>
                      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ backgroundColor: "var(--heat-near)" }} />Under goal<span className="size-2.5 rounded-[3px]" style={{ backgroundColor: "var(--heat-miss)" }} />Well under</span>
                      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] ring-1 ring-brand-500" />Today</span>
                    </div>
                  </div>
                )}
                </div>
              </div>

              <div className="card">
                <div className="card-title flex items-center gap-2"><Target size={15} /> Latest mock</div>
                {lastMock ? (
                  <div>
                    <Link to={`/mocks/${lastMock.id}`} className="group block">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-white">{pct(lastMock)}%</span>
                        {mockDelta !== null && mockDelta !== 0 && (
                          <span className={`text-xs font-medium tabular-nums ${mockDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {mockDelta > 0 ? "▲" : "▼"} {Math.abs(mockDelta)} vs previous
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-brand-600 group-hover:underline dark:text-brand-300">{lastMock.name} →</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(lastMock.date)} · {lastMock.score}/{lastMock.maxScore}
                        {lastMock.accuracy != null && <> · {lastMock.accuracy}% accuracy</>}
                        {lastMock.timeMin ? <> · {fmtDur(lastMock.timeMin)}</> : null}
                      </div>
                    </Link>

                    {lastMock.correct != null && (() => {
                      const c = lastMock.correct ?? 0, w = lastMock.wrong ?? 0, k = lastMock.skipped ?? 0;
                      const tot = c + w + k || 1;
                      return (
                        <div className="mt-3">
                          <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[.06]" role="img" aria-label={`${c} correct, ${w} wrong, ${k} skipped`}>
                            <span className="bg-emerald-500" style={{ width: `${(c / tot) * 100}%` }} />
                            <span className="bg-rose-500" style={{ width: `${(w / tot) * 100}%` }} />
                            <span className="bg-slate-300 dark:bg-slate-600" style={{ width: `${(k / tot) * 100}%` }} />
                          </div>
                          <div className="mt-1 flex gap-3 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                            <span>{c} correct</span><span>{w} wrong</span><span>{k} skipped</span>
                          </div>
                        </div>
                      );
                    })()}

                    {lastMock.weakSubjects.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{lastMock.weakSubjects.map((s) => <span key={s} className="chip bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{s}</span>)}</div>}

                    {recentMocks.length > 1 && (
                      <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-white/[.07]">
                        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Recent attempts</span>
                          <Link to="/mocks" className="text-brand-600 hover:underline dark:text-brand-300">all →</Link>
                        </div>
                        <ul className="space-y-0.5">
                          {recentMocks.slice(1).map((m) => (
                            <li key={m.id}>
                              <Link to={`/mocks/${m.id}`} title={`${m.name} · ${formatDate(m.date)}`} className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.25rem] items-center gap-2 rounded-lg px-1.5 py-1 text-xs transition hover:bg-slate-50 dark:hover:bg-white/[.04]">
                                <span className="truncate text-slate-700 dark:text-slate-300">{m.name}</span>
                                <span className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[.06]"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.max(0, Math.min(100, pct(m)))}%` }} /></span>
                                <span className="text-right font-medium tabular-nums text-slate-700 dark:text-slate-200">{pct(m)}%</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : <Empty icon={<Target />} text="No mock logged yet" />}
              </div>

              <div className="card">
                <div className="card-title flex items-center justify-between">Why I lose marks <Link to="/mistakes" className="text-xs font-normal text-brand-600 dark:text-brand-300 hover:underline">open log →</Link></div>
                {topReasons.length ? (
                  <div className="space-y-2.5">
                    {topReasons.map(({ k, n }) => (
                      <div key={k}>
                        <div className="mb-1 flex justify-between text-xs"><span>{REASONS[k].label}</span><span className="tabular-nums text-slate-500 dark:text-slate-400">{n}</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full" style={{ width: `${(n / maxReason) * 100}%`, background: REASONS[k].bar }} /></div>
                      </div>
                    ))}
                  </div>
                ) : <Empty icon={<Target />} text="Log mistakes to see patterns" />}
              </div>
            </div>
          </div>

          <div className="space-y-5 max-xl:contents xl:sticky xl:top-4">
            <div className="max-xl:order-2"><FocusNow /></div>
            <div className="max-xl:order-6"><QuickAdd /></div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Today's tasks, in time order — the same tasks as the Schedule page. */
function TodayPlan() {
  const { state } = useStore();
  const { toggleDone, reschedule, drop } = useTasks();
  const today = todayISO();
  const now = useMinute();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const plan = tasksOn(state, today, today);
  const rank = (t: TodoItem) => (t.status === "done" ? 2 : phaseOf(t, today) === "overdue" ? 0 : 1);
  const tasks = [...plan].sort((a, b) => rank(a) - rank(b) || (a.planned === today ? a.start ?? "99" : "00").localeCompare(b.planned === today ? b.start ?? "99" : "00"));
  const backlog = state.todos.filter((t) => columnOf(t, today) === "backlog");
  const comingUp = state.todos.filter((t) => phaseOf(t, today) === "upcoming" && (startOf(t) ?? "") <= addDays(today, 7)).sort((a, b) => (startOf(a) ?? "").localeCompare(startOf(b) ?? "")).slice(0, 3);
  const missed = state.todos.filter((t) => phaseOf(t, today) === "overdue");
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="card-title !mb-0 flex items-center gap-2"><ListTodo size={15} aria-hidden />Today</div>
        {tasks.length > 0 && (
          <div className="flex min-w-32 max-w-56 flex-1 items-center gap-2" title={`${done} of ${tasks.length} done`}>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Today's progress"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{done}/{tasks.length}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <Link to="/schedule" className="text-brand-600 dark:text-brand-300">Open schedule →</Link>
          <Link to="/schedule?new=1" className="btn !px-2.5 !py-1 !text-xs"><Plus size={13} />New task</Link>
        </div>
      </div>

      {missed.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          {missed.length} unfinished task{missed.length > 1 ? "s" : ""} from earlier days
          <button className="ml-auto cursor-pointer font-semibold underline-offset-2 hover:underline" onClick={() => missed.forEach((t) => reschedule(t.id, today))}>Move to today</button>
          <button className="cursor-pointer font-semibold underline-offset-2 hover:underline" title="Leave them on their days, marked dropped" onClick={() => missed.forEach((t) => drop(t.id))}>Drop</button>
          <Link to="/schedule" className="font-semibold underline-offset-2 hover:underline">Review</Link>
        </div>
      )}

      {tasks.length ? tasks.slice(0, 8).map((t) => {
        const isDone = t.status === "done";
        const late = phaseOf(t, today) === "overdue";
        const counter = dayCounter(t, today);
        const own = t.planned === today && t.start && t.end;
        const live = !isDone && own && toMin(t.start!) <= nowMin && nowMin < toMin(t.end!);
        return (
          <div key={t.id} className={`flex items-center gap-2.5 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-white/5 ${live ? "-mx-2 rounded-lg bg-brand-50 px-2 dark:bg-brand-500/10" : ""}`}>
            <input type="checkbox" className="size-4 shrink-0 cursor-pointer accent-emerald-600" checked={isDone} aria-label={`Mark ${t.title} ${isDone ? "not done" : "done"}`} onChange={() => toggleDone(t)} />
            <div className="w-16 shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">{own ? clock12(t.start!) : "all day"}</div>
            <div className="min-w-0 flex-1">
              <div className={`line-clamp-2 break-words ${isDone ? "text-slate-500 dark:text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>{t.title}</div>
              <div className="flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                {late && <span className="font-medium text-rose-600 dark:text-rose-400">{-daysUntil(t.due ?? t.planned ?? today)}d overdue</span>}
                {counter && <span className="text-indigo-600 dark:text-indigo-300">{counter}</span>}
                {t.due && !late && !isDone && t.due !== t.planned && <span>due {daysUntil(t.due) === 0 ? "today" : formatDate(t.due)}</span>}
                {t.revision && <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400"><RotateCcw size={10} aria-hidden />revision · every {t.revision.intervalDays}d</span>}
                {!!t.subjects?.length && <span>{t.subjects.join(", ")}</span>}
                {!!t.timeMin && <span>{fmtDur(t.timeMin)} focused{plannedMin(t) > 0 && ` / ${fmtDur(plannedMin(t))}`}</span>}
              </div>
            </div>
            {live && <span className="chip bg-brand-600 text-white">now</span>}
            <PlayButton task={t} />
          </div>
        );
      }) : <Empty icon={<CheckCircle2 />} text="Nothing planned for today — add a task to get going" />}
      {tasks.length > 8 && <div className="pt-2 text-xs text-slate-500 dark:text-slate-400">+{tasks.length - 8} more on the schedule</div>}

      {(comingUp.length > 0 || backlog.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:text-slate-400 dark:border-white/5">
          {comingUp.length > 0 && <span className="font-semibold text-slate-600 dark:text-slate-300">Coming up</span>}
          {comingUp.map((t) => <span key={t.id} className="chip bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{t.title} · {daysUntil(startOf(t) ?? today) === 1 ? "tomorrow" : formatDate(startOf(t) ?? today)}</span>)}
          {backlog.length > 0 && <Link to="/schedule" className="ml-auto text-brand-600 dark:text-brand-300">{backlog.length} waiting in todo →</Link>}
        </div>
      )}
    </div>
  );
}

function FocusNow() {
  const p = usePomodoro();
  const { state, catalog, setState } = useStore();
  const todayD = todayISO();
  const goal = goalOn(state, todayD);
  const [editGoal, setEditGoal] = useState(false);
  const setTodayGoal = (m: number | undefined) => setState((s) => {
    const g = { ...s.goalByDay };
    if (m === undefined) delete g[todayD]; else g[todayD] = m;
    return { ...s, goalByDay: g };
  });
  const sessions = state.pomodoros.filter((x) => x.kind === "focus" && isSameDay(x.startedAt));
  const logged = sessions.reduce((a, x) => a + x.minutes, 0);
  const onTasks = sessions.filter((x) => x.taskId).reduce((a, x) => a + x.minutes, 0);
  const live = Math.floor(p.elapsed / 60);
  const pct = goal ? Math.min(100, Math.round(((logged + live) / goal) * 100)) : 0;
  const color = p.running ? "#6366f1" : "#64748b";
  const task = p.taskId ? state.todos.find((t) => t.id === p.taskId) : undefined;
  const choices = tasksOn(state, todayD, todayD).filter((t) => t.status !== "done");
  if (task && !choices.some((t) => t.id === task.id)) choices.push(task);
  const est = task ? plannedMin(task) : 0;
  return (
    <div className="card">
      <div className="card-title">Focus now</div>
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <div className="text-xs font-semibold" style={{ color }}>{p.running ? "Focusing" : p.started ? "Paused" : "Ready"}</div>
          <div className="font-mono text-4xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white" role="timer">{formatClock(p.elapsed)}</div>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <TimerControls />
          <div className="text-xs text-slate-500 dark:text-slate-400">{p.started ? "End logs the time." : "Counts up from when you press start."}</div>
          {task && <div className="text-xs text-indigo-600 dark:text-indigo-300">{fmtDur((task.timeMin ?? 0) + live)} logged{est > 0 && ` of ${fmtDur(est)}`}</div>}
        </div>
      </div>
      <label className="mt-3 block">
        <span className="label">Working on</span>
        <select aria-label="Task to log time against" className="input" disabled={p.started} value={p.taskId ?? ""} onChange={(e) => { const t = state.todos.find((x) => x.id === e.target.value); p.selectTask(t ? t.id : null, t?.title, t?.subjects?.join(", ")); }}>
          <option value="">Extra study (not a task)</option>
          {choices.map((t) => <option key={t.id} value={t.id}>{t.start && t.planned === todayD ? `${clock12(t.start)} · ` : ""}{t.title}</option>)}
        </select>
        {p.started && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">End the session to switch task.</span>}
      </label>
      {!p.taskId && (
        <div className="mt-2 flex gap-2">
          <input aria-label="What are you studying" className="input min-w-0 flex-1" placeholder="Studying what?" value={p.label} onChange={(e) => p.setLabel(e.target.value)} />
          <select aria-label="Subject" className="input !w-36" value={p.subject} onChange={(e) => p.setSubject(e.target.value)}>
            <option value="">Subject</option>{catalog.subjects.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
      )}
      {!p.taskId && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Extra sessions only show in today’s session log; they don’t count toward any task.</p>}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Today’s goal <button onClick={() => setEditGoal((v) => !v)} className="cursor-pointer text-brand-600 hover:underline dark:text-brand-300">{editGoal ? "done" : "change"}</button></span>
          <span>{fmtDur(logged + live)} / {goal ? fmtDur(goal) : "rest day"}{onTasks > 0 && ` · ${fmtDur(onTasks)} on tasks`}</span>
        </div>
        {editGoal && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <HoursInput className="input !w-28 !py-1 text-xs" minutes={goal} onChange={(m) => { if (m) setTodayGoal(m); }} label="Today’s goal (hours.min)" />
            <button onClick={() => setTodayGoal(0)} className={`cursor-pointer rounded-lg px-2 py-1 text-xs ${goal === 0 ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[.06] dark:text-slate-300"}`}>Rest day</button>
            {state.goalByDay?.[todayD] !== undefined && <button onClick={() => setTodayGoal(undefined)} className="cursor-pointer text-xs text-slate-500 hover:underline dark:text-slate-400">Use default</button>}
          </div>
        )}
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} /></div>
      </div>
    </div>
  );
}

type Tab = "mistake" | "revision" | "mock";

function QuickAdd() {
  const { catalog, setState } = useStore();
  const { create } = useTasks();
  const [tab, setTab] = useState<Tab>("mistake");
  const [text, setText] = useState("");
  const [subject, setSubject] = useState(catalog.subjects[0]);
  const [score, setScore] = useState("");
  const [max, setMax] = useState("100");
  const today = todayISO();

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    if (tab === "mistake") setState((s) => ({ ...s, mistakes: [{ id: uid(), date: today, subject, topic: "", kind: "concept", question: t, fix: "", resolved: false }, ...s.mistakes] }));
    if (tab === "revision") create({ title: t, subjects: [subject], planned: addDays(today, 1), revision: { key: uid(), intervalDays: 1, lastReviewed: today } }, { untimed: true });
    if (tab === "mock") {
      if (score === "") return;
      setState((s) => ({ ...s, mocks: [{ id: uid(), name: t, source: "GateQA", type: "full", date: today, score: Number(score), maxScore: Number(max) || 100, weakSubjects: [], notes: "" }, ...s.mocks] }));
      setScore("");
    }
    setText("");
  };

  const tabs: [Tab, string][] = [["mistake", "Mistake"], ["revision", "Revision"], ["mock", "Mock"]];
  const ph = { mistake: "What went wrong?", revision: "Topic studied…", mock: "Mock name…" }[tab];

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center gap-1">
        <div className="card-title !mb-0 mr-1">Quick log</div>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-sm transition-colors ${tab === k ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"}`}>{l}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(tab === "mistake" || tab === "revision") && (
          <select aria-label="Subject" className="input !w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}>{catalog.subjects.map((x) => <option key={x}>{x}</option>)}</select>
        )}
        <input id="quick-add-input" aria-label={ph} className="input min-w-[9rem] flex-1" placeholder={ph} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
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

/** The one thing to do right now: the task in its slot, else the next one, with the timer one press away. */
function NowBand() {
  const { state } = useStore();
  const p = usePomodoro();
  const today = todayISO();
  const now = useMinute();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const open = tasksOn(state, today, today).filter((t) => t.status !== "done");
  const own = (t: TodoItem) => t.planned === today && t.start && t.end;
  const running = p.taskId ? open.find((t) => t.id === p.taskId) : undefined;
  const live = open.find((t) => own(t) && toMin(t.start!) <= nowMin && nowMin < toMin(t.end!));
  const next = open.filter((t) => own(t) && toMin(t.start!) > nowMin).sort((a, b) => a.start!.localeCompare(b.start!))[0];
  const late = open.find((t) => phaseOf(t, today) === "overdue");
  const task = running ?? live ?? late ?? next ?? open[0];
  const label = running ? (p.running ? "Focusing on" : "Paused on") : task === live ? "Now" : task === late ? "Overdue" : "Up next";

  if (!task) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div><div className="text-base font-semibold text-slate-900 dark:text-white">{state.todos.some((t) => t.status === "done" && t.doneAt === today) ? "Everything planned is done" : "Nothing planned for today"}</div><div className="text-sm text-slate-500 dark:text-slate-400">Add a task to get going.</div></div>
        <Link to="/schedule?new=1" className="btn"><Plus size={15} />New task</Link>
      </div>
    );
  }
  const on = p.taskId === task.id && p.started;
  return (
    <div className="card flex flex-wrap items-center gap-4 !border-brand-500/30 !bg-brand-50/60 dark:!bg-brand-500/10">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-brand-700 dark:text-brand-50">{label}{own(task) && ` · ${clock12(task.start!)} – ${clock12(task.end!)}`}</div>
        <div className="mt-0.5 line-clamp-2 break-words text-xl font-semibold text-slate-900 dark:text-white">{task.title}</div>
        {!!task.subjects?.length && <div className="text-sm text-slate-600 dark:text-slate-300">{task.subjects.join(", ")}</div>}
      </div>
      {on ? (
        <>
          <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{formatClock(p.elapsed)}</div>
          <TimerControls />
        </>
      ) : <PlayButton task={task} className="!size-11" />}
    </div>
  );
}

/** current time, refreshed every minute so "now" / "up next" don't go stale while the timer is idle */
function useMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
