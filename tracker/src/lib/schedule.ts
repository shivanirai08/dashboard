import { addDays, isSameDay, todayISO } from "./dates";
import { plannedMin, tasksOn } from "./tasks";
import type { AppState, TodoItem } from "./types";

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

export const fromMin = (min: number) => {
  const c = Math.max(0, Math.min(24 * 60, min));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
};

/** current clock time as "HH:MM" */
export const nowHM = (d = new Date()) => fromMin(d.getHours() * 60 + d.getMinutes());

export const clock12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 || h === 24 ? "am" : "pm"}`;
};

/** Input notation only: hours.minutes, 165 min → "2.45", 30 min → "0.30". */
export const fmtHM = (min: number) => {
  const t = Math.max(0, Math.round(min));
  return `${Math.floor(t / 60)}.${String(t % 60).padStart(2, "0")}`;
};
/** Shown in the UI with both parts: 165 min → "2h 45m", 30 min → "0h 30m". */
export const fmtDur = (min: number) => {
  const t = Math.max(0, Math.round(min));
  return `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, "0")}m`;
};

/** Reads "2.45" as 2 h 45 min and "0.30" as 30 min (a lone digit is tens: "2.5" = 2.50). Minutes must be under 60. */
export function parseHM(text: string): number | undefined {
  const m = text.trim().replace(",", ".").match(/^(\d*)(?:\.(\d{0,2}))?$/);
  if (!m || (!m[1] && !m[2])) return undefined;
  const mins = Number((m[2] ?? "").padEnd(2, "0"));
  return mins < 60 ? Number(m[1] || 0) * 60 + mins : undefined;
}

export const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00`).getDay();

/** Monday of the week containing `iso`. */
export const weekStartOf = (iso: string) => addDays(iso, -((weekdayOf(iso) + 6) % 7));

export const weekDates = (iso: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStartOf(iso), i));

/** Whole weeks (Mon–Sun) covering the month of `iso`. */
export function monthDates(iso: string): string[] {
  const first = `${iso.slice(0, 7)}-01`;
  const last = addDays(`${addDays(first, 32).slice(0, 7)}-01`, -1);
  const start = weekStartOf(first);
  const count = Math.ceil((Math.round((new Date(`${last}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000) + 1) / 7) * 7;
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** Tasks that sit on the time grid on `date`. */
export const timedOn = (state: AppState, date: string) =>
  state.todos.filter((t) => t.planned === date && t.start && t.end).sort((a, b) => a.start!.localeCompare(b.start!) || a.end!.localeCompare(b.end!));

export type DayStats = {
  date: string;
  /** everything on the plan that day (includes carried-over and multi-day tasks) */
  tasks: TodoItem[];
  /** tasks that start on this day with a time */
  timed: TodoItem[];
  plannedMin: number;
  doneMin: number;
  done: number;
  /** 0–1, or null when nothing was planned */
  completion: number | null;
  focusMin: number;
  /** focus time logged against a task vs. free "extra study" */
  taskFocusMin: number;
  extraFocusMin: number;
  mistakes: number;
};

export function dayStats(state: AppState, date: string, today = todayISO()): DayStats {
  const tasks = tasksOn(state, date, today);
  const timed = timedOn(state, date);
  const done = tasks.filter((t) => t.status === "done");
  const sessions = state.pomodoros.filter((p) => p.kind === "focus" && isSameDay(p.startedAt, date));
  const taskFocusMin = sessions.filter((p) => p.taskId).reduce((a, p) => a + p.minutes, 0);
  const focusMin = sessions.reduce((a, p) => a + p.minutes, 0);
  return {
    date,
    tasks,
    timed,
    plannedMin: timed.reduce((a, t) => a + plannedMin(t), 0),
    doneMin: timed.filter((t) => t.status === "done").reduce((a, t) => a + plannedMin(t), 0),
    done: done.length,
    completion: tasks.length ? done.length / tasks.length : null,
    focusMin,
    taskFocusMin,
    extraFocusMin: focusMin - taskFocusMin,
    mistakes: state.mistakes.filter((m) => m.date === date).length,
  };
}

/** Greedy lane assignment so overlapping items sit side by side. */
export function layoutLanes(items: { id: string; start?: string; end?: string }[]): Map<string, { lane: number; lanes: number }> {
  const out = new Map<string, { lane: number; lanes: number }>();
  let cluster: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const c of cluster) out.set(c.id, { lane: c.lane, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
  };
  for (const b of items) {
    const s = toMin(b.start ?? "00:00");
    const e = Math.max(toMin(b.end ?? "00:00"), s + 15);
    if (s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = e;
    cluster.push({ id: b.id, lane });
    clusterEnd = Math.max(s >= clusterEnd ? 0 : clusterEnd, e);
  }
  flush();
  return out;
}
