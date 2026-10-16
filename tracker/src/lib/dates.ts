export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
  return iso.slice(0, 10) === day;
}
