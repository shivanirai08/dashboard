import { BookingStatus, MechanicStatus } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { bookingInclude, endOfDay, startOfDay } from "../../lib/formatters.js";

export const dashboardRepository = {
  countBookings() {
    return prisma.booking.count();
  },

  countBookingsInRange(start: Date, end: Date) {
    return prisma.booking.count({
      where: { scheduledAt: { gte: start, lte: end } },
    });
  },

  countBookingsByStatusInRange(status: BookingStatus, start: Date, end: Date) {
    return prisma.booking.count({
      where: { status, scheduledAt: { gte: start, lte: end } },
    });
  },

  countTodayBookings() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(todayStart);
    return prisma.booking.count({
      where: { scheduledAt: { gte: todayStart, lte: todayEnd } },
    });
  },

  countYesterdayBookings() {
    const yesterday = startOfDay(new Date());
    yesterday.setDate(yesterday.getDate() - 1);
    return prisma.booking.count({
      where: { scheduledAt: { gte: yesterday, lte: endOfDay(yesterday) } },
    });
  },

  groupBookingsByStatus() {
    return prisma.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
  },

  aggregateCompletedRevenue() {
    return prisma.booking.aggregate({
      where: { status: BookingStatus.completed },
      _sum: { amount: true },
    });
  },

  aggregateCompletedRevenueInRange(start: Date, end: Date) {
    return prisma.booking.aggregate({
      where: {
        status: BookingStatus.completed,
        scheduledAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });
  },

  countActiveMechanics() {
    return prisma.mechanic.count({
      where: { status: { in: [MechanicStatus.available, MechanicStatus.on_job] } },
    });
  },

  countNewCustomers(since: Date, until?: Date) {
    return prisma.customer.count({
      where: {
        createdAt: until ? { gte: since, lte: until } : { gte: since },
      },
    });
  },

  findRecentBookings(limit: number) {
    return prisma.booking.findMany({
      take: limit,
      orderBy: { scheduledAt: "desc" },
      include: bookingInclude,
    });
  },

  findRecentActivities(limit: number) {
    return prisma.bookingActivity.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        booking: { select: { bookingNumber: true } },
      },
    });
  },
};
