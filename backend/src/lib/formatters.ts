const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatScheduledDate(date: Date): { date: string; time: string } {
  return {
    date: `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function formatMoney(amount: number | { toNumber(): number }): string {
  const value = typeof amount === "number" ? amount : amount.toNumber();
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function compactMoney(amount: number): string {
  if (amount >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}k`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/** Percent change current vs previous, 1 decimal. Null when both periods are empty. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return null;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function daysAgoStart(days: number, from = new Date()): Date {
  const d = startOfDay(from);
  d.setDate(d.getDate() - days);
  return d;
}

export type BookingWithRelations = {
  id: string;
  bookingNumber: string;
  vehicle: string;
  plate: string;
  status: string;
  amount: { toNumber(): number };
  scheduledAt: Date;
  location: string;
  customer: { name: string; phone: string };
  mechanic: { name: string } | null;
  service: { name: string };
};

export function mapBooking(row: BookingWithRelations) {
  const { date, time } = formatScheduledDate(row.scheduledAt);
  return {
    id: row.bookingNumber,
    customer: row.customer.name,
    phone: row.customer.phone,
    vehicle: row.vehicle,
    plate: row.plate,
    service: row.service.name,
    mechanic: row.mechanic?.name ?? null,
    status: row.status,
    amount: row.amount.toNumber(),
    date,
    time,
    location: row.location,
  };
}

export const bookingInclude = {
  customer: { select: { name: true, phone: true } },
  mechanic: { select: { name: true } },
  service: { select: { name: true } },
} as const;
