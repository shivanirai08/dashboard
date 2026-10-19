import { addDays, isSameDay, todayISO } from "./dates";
import type { AppState, TodoItem } from "./types";

/**
 * One task = one unit on both the calendar and the board.
 *   no date            → "keep in todo" (backlog)
 *   planned (+ time)   → on the calendar that day, and in progress from then until it is done
 *   due (optional)     → later deadline for tasks that span several days
 * Unfinished past its last day → overdue; it keeps showing on today until done.
 */
export type TaskPhase = "done" | "overdue" | "active" | "upcoming" | "backlog";
export type Column = "backlog" | "todo" | "doing" | "done";

export const startOf = (t: TodoItem) => t.planned ?? t.due;
export const deadlineOf = (t: TodoItem) => t.due ?? t.planned;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** planned length in minutes (0 when untimed) */
export const plannedMin = (t: TodoItem) => (t.start && t.end ? Math.max(0, toMin(t.end) - toMin(t.start)) : 0);

/** last day the task is on the plan (unfinished tasks carry over to today) */
function endOf(t: TodoItem, today: string): string | undefined {
  const start = startOf(t);
  const end = deadlineOf(t);
  if (!start || !end) return undefined;
  if (t.status === "done") return t.doneAt ? (t.doneAt < end ? t.doneAt : end) : end;
  return start <= today && end < today ? today : end;
}

export function phaseOf(t: TodoItem, today = todayISO()): TaskPhase {
  if (t.status === "done") return "done";
  const start = startOf(t);
  const end = deadlineOf(t);
  if (!start || !end) return "backlog";
  if (end < today) return "overdue";
  if (start > today) return "upcoming";
  return "active";
}

/** Is the task on the plan for `date`? */
export function onPlan(t: TodoItem, date: string, today = todayISO()): boolean {
  const start = startOf(t);
  // a finished task never follows you to a later day; it only shows on the day it was finished
  // when that was *before* its own day (done early) or it had no day at all
  if (t.status === "done" && t.doneAt === date && (!start || t.doneAt < start)) return true;
  const end = endOf(t, today);
  return !!start && !!end && start <= date && date <= end;
}

export const tasksOn = (state: AppState, date: string, today = todayISO()) => state.todos.filter((t) => onPlan(t, date, today));

/** Tasks that touch any day in [from, to], each once. Unscheduled tasks are not included. */
export function tasksBetween(state: AppState, from: string, to: string, today = todayISO()) {
  return state.todos.filter((t) => {
    const start = startOf(t);
    const end = endOf(t, today);
    if (t.status === "done" && t.doneAt && t.doneAt >= from && t.doneAt <= to && (!start || t.doneAt < start)) return true;
    return !!start && !!end && start <= to && end >= from;
  });
}

/** Board column. A scheduled task is "in progress" from its day on — no dragging needed. */
export function columnOf(t: TodoItem, today = todayISO()): Column {
  if (t.status === "done") return "done";
  if (t.status === "doing") return "doing";
  if (!t.planned && !t.due) return "backlog";
  const start = startOf(t)!;
  return start <= today ? "doing" : "todo";
}

export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000);

/** Patch that remembers the slot an overdue task is leaving, so its original day keeps a copy. */
export function missPatch(t: TodoItem, newDate: string, today = todayISO()): Pick<TodoItem, "missed"> | undefined {
  if (t.status === "done" || !t.planned || phaseOf(t, today) !== "overdue" || newDate < today || newDate <= t.planned) return undefined;
  if (t.missed?.some((m) => m.date === t.planned)) return undefined;
  return { missed: [...(t.missed ?? []), { date: t.planned, start: t.start, end: t.end, due: t.due }] };
}

/**
 * Faded copies shown on every day a task sat unfinished: from the day it was first missed up to the day before
 * its current one. `day` is 0 on the first missed day, then 1, 2 … ("overdue day N").
 */
export const missedOn = (state: AppState, date: string) =>
  state.todos.flatMap((t) => {
    const first = t.missed?.[0];
    if (!first || !t.planned || date < first.date || date >= t.planned || (t.doneAt && date > t.doneAt)) return [];
    const slot = [...t.missed!].reverse().find((m) => m.date <= date) ?? first;
    return [{ task: t, slot, day: daysBetween(first.date, date) }];
  });

/** Focus minutes logged against a task on one day */
export const focusOn = (state: AppState, taskId: string, date: string) =>
  state.pomodoros.filter((p) => p.kind === "focus" && p.taskId === taskId && isSameDay(p.startedAt, date)).reduce((a, p) => a + p.minutes, 0);

/** Day-by-day time contribution from the first day (first missed day, else its planned day) up to today / when it was done */
export function dailyContribution(state: AppState, t: TodoItem, today = todayISO()) {
  const first = t.missed?.[0]?.date ?? t.planned;
  if (!first) return [];
  const last = t.doneAt && t.doneAt < today ? t.doneAt : today;
  const rows: { date: string; day: number; min: number }[] = [];
  for (let d = first, i = 1; d <= last && i <= 120; d = addDays(d, 1), i++) rows.push({ date: d, day: i, min: focusOn(state, t.id, d) });
  return rows;
}

/** "Overdue day 2": days since it was first missed, for unfinished tasks that have been carried over */
export function overdueDay(t: TodoItem, today = todayISO()): number | null {
  if (t.status === "done" || !t.missed?.length) return null;
  const n = daysBetween(t.missed[0].date, today);
  return n >= 1 ? n : null;
}

/** "Day 2 of 4" for a task spanning several days */
export function dayCounter(t: TodoItem, today = todayISO()): string | null {
  if (!t.planned || !t.due || t.planned >= t.due || t.status === "done") return null;
  const span = Math.round((new Date(`${t.due}T12:00:00`).getTime() - new Date(`${t.planned}T12:00:00`).getTime()) / 86_400_000) + 1;
  const day = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${t.planned}T12:00:00`).getTime()) / 86_400_000) + 1;
  return day >= 1 && day <= span ? `Day ${day} of ${span}` : null;
}
