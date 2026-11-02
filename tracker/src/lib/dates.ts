// local calendar date (toISOString would give the UTC date, wrong for IST mornings)
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * "End day" presses, date -> when. The day is over when the user says so, not at midnight:
 * until the previous day is ended, the small hours (before GRACE_HOUR) still belong to it.
 */
let dayEnds: Record<string, string> = {};
const GRACE_HOUR = 4;

export function setDayEnds(e: Record<string, string> | undefined) {
  dayEnds = e ?? {};
}

/** the day a moment belongs to, honouring "End day" and the late-night grace window */
export function logicalDay(at: Date): string {
  let day = localISO(at);
  if (at.getHours() < GRACE_HOUR) {
    const prev = addDays(day, -1);
    const ended = dayEnds[prev];
    if (!ended || new Date(ended) > at) day = prev;
  }
  const ended = dayEnds[day];
  return ended && new Date(ended) <= at ? addDays(day, 1) : day;
}

export function todayISO(): string {
  return logicalDay(new Date());
}

/** true in the small hours while the previous day is still open (so "End day" is available) */
export function dayStillOpen(): boolean {
  return todayISO() < localISO(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localISO(d);
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function daysUntil(iso: string): number {
  const today = new Date(`${todayISO()}T12:00:00`).getTime();
  const due = new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
  return Math.round((due - today) / 86_400_000);
}

export function isSameDay(iso: string, day = todayISO()): boolean {
  // full timestamps are compared by the day they belong to
  return dayOf(iso) === day;
}

/** local calendar date of a timestamp ("YYYY-MM-DD" passes through) */
export function dayOf(iso: string): string {
  return iso.length > 10 ? logicalDay(new Date(iso)) : iso;
}
