import { BookingStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { endOfDay, startOfDay } from "../../lib/formatters.js";

export const analyticsRepository = {
  findBookingsInRange(start: Date, end: Date) {
    return prisma.booking.findMany({
      where: { scheduledAt: { gte: start, lte: end } },
      select: { status: true, amount: true },
    });
  },

  groupAllBookingsByStatus() {
    return prisma.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
  },

  groupBookingsByStatusInRange(start: Date, end: Date) {
    return prisma.booking.groupBy({
      by: ["status"],
      where: { scheduledAt: { gte: start, lte: end } },
      _count: { _all: true },
    });
  },

  groupBookingsByService(start: Date, end: Date, limit: number) {
    return prisma.booking.groupBy({
      by: ["serviceId"],
      where: { scheduledAt: { gte: start, lte: end } },
      _count: { _all: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: limit,
    });
  },

  findServicesByIds(ids: string[]) {
    return prisma.serviceCategory.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
  },

  dateRangeForDays(days: number) {
    const end = endOfDay(startOfDay(new Date()));
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end };
  },

  /** Equal-length window immediately before `currentStart`. */
  previousRange(currentStart: Date, days: number) {
    const end = endOfDay(new Date(currentStart.getTime() - 1));
    const start = startOfDay(end);
    start.setDate(end.getDate() - (days - 1));
    return { start, end };
  },
};

export function parseAnalyticsRange(value: string | undefined): number {
  if (value === "7d") return 7;
  if (value === "90d") return 90;
  return 30;
}

export function rangeLabel(days: number): "7d" | "30d" | "90d" {
  if (days === 7) return "7d";
  if (days === 90) return "90d";
  return "30d";
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  assigned: "Assigned",
  on_the_way: "On the way",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function sumBookingTotals(
  bookings: Array<{ status: BookingStatus; amount: { toNumber(): number } }>,
) {
  return bookings.reduce(
    (acc, booking) => {
      acc.bookings += 1;
      if (booking.status === BookingStatus.completed) {
        acc.completed += 1;
        acc.revenue += booking.amount.toNumber();
      }
      return acc;
    },
    { bookings: 0, completed: 0, revenue: 0 },
  );
}
