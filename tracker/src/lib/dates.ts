// local calendar date (toISOString would give the UTC date, wrong for IST mornings)
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayISO(): string {
  return localISO(new Date());
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
  // full timestamps are compared by their local date
  return (iso.length > 10 ? localISO(new Date(iso)) : iso) === day;
}
