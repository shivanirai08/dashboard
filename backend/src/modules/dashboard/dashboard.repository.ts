import { BookingStatus, MechanicStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { bookingInclude, endOfDay, startOfDay } from "../../lib/formatters.js";

export const dashboardRepository = {
  countBookings() {
    return prisma.booking.count();
  },

  countTodayBookings() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(todayStart);
    return prisma.booking.count({
      where: { scheduledAt: { gte: todayStart, lte: todayEnd } },
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

  countActiveMechanics() {
    return prisma.mechanic.count({
      where: { status: { in: [MechanicStatus.available, MechanicStatus.on_job] } },
    });
  },

  countNewCustomers(since: Date) {
    return prisma.customer.count({ where: { createdAt: { gte: since } } });
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
