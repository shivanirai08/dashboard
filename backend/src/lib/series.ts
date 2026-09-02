import { BookingStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { dayKey, startOfDay } from "./formatters.js";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export async function buildBookingSeries(days: number) {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  const bookings = await prisma.booking.findMany({
    where: { scheduledAt: { gte: start, lte: end } },
    select: { scheduledAt: true, status: true, amount: true },
  });

  const buckets = new Map<string, { bookings: number; completed: number; revenue: number }>();

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(dayKey(d), { bookings: 0, completed: 0, revenue: 0 });
  }

  for (const booking of bookings) {
    const key = dayKey(booking.scheduledAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.bookings += 1;
    if (booking.status === BookingStatus.completed) {
      bucket.completed += 1;
      bucket.revenue += booking.amount.toNumber();
    }
  }

  return Array.from(buckets.entries()).map(([key, value]) => {
    const [year, month, day] = key.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return {
      label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
      full: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      bookings: value.bookings,
      completed: value.completed,
      revenue: value.revenue,
    };
  });
}
