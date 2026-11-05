import type { AppState } from "./types";

export const DEFAULT_GOAL_MIN = 240;

type GoalState = Pick<AppState, "dailyGoalMin" | "goalByDay" | "goalFrom">;

/** the default goal in force on a day: the latest "from" entry on or before it, else the original baseline */
export function defaultGoalOn(s: GoalState, day: string): number {
  let best: string | undefined;
  for (const from of Object.keys(s.goalFrom ?? {})) if (from <= day && (best === undefined || from > best)) best = from;
  return best !== undefined ? s.goalFrom![best] : s.dailyGoalMin ?? DEFAULT_GOAL_MIN;
}

/** a day's goal in minutes: its own override, else the default that applied then. 0 = rest day. */
export function goalOn(s: GoalState, day: string): number {
  return s.goalByDay?.[day] ?? defaultGoalOn(s, day);
}
