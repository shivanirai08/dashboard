import { BookingStatus } from "../../lib/enums.js";
import {
  compactMoney,
  daysAgoStart,
  endOfDay,
  mapBooking,
  pctChange,
  startOfDay,
  timeAgo,
} from "../../lib/formatters.js";
import { buildBookingSeries } from "../../lib/series.js";
import { dashboardRepository } from "./dashboard.repository.js";

export const dashboardService = {
  async getOverview() {
    const today = startOfDay(new Date());
    const yesterday = daysAgoStart(1);
    const last30Start = daysAgoStart(29);
    const prev30Start = daysAgoStart(59);
    const prev30End = endOfDay(daysAgoStart(30));
    const last30End = endOfDay(today);

    const [
      totalBookings,
      todayBookings,
      yesterdayBookings,
      statusCounts,
      revenueAgg,
      activeMechanics,
      newCustomers,
      prevNewCustomers,
      bookingsLast30,
      bookingsPrev30,
      completedLast30,
      completedPrev30,
      cancelledLast30,
      cancelledPrev30,
      pendingToday,
      pendingYesterday,
      revenueLast30,
      revenuePrev30,
      recentBookings,
      activities,
      series30,
    ] = await Promise.all([
      dashboardRepository.countBookings(),
      dashboardRepository.countTodayBookings(),
      dashboardRepository.countYesterdayBookings(),
      dashboardRepository.groupBookingsByStatus(),
      dashboardRepository.aggregateCompletedRevenue(),
      dashboardRepository.countActiveMechanics(),
      dashboardRepository.countNewCustomers(last30Start),
      dashboardRepository.countNewCustomers(prev30Start, prev30End),
      dashboardRepository.countBookingsInRange(last30Start, last30End),
      dashboardRepository.countBookingsInRange(prev30Start, prev30End),
      dashboardRepository.countBookingsByStatusInRange(
        BookingStatus.completed,
        last30Start,
        last30End,
      ),
      dashboardRepository.countBookingsByStatusInRange(
        BookingStatus.completed,
        prev30Start,
        prev30End,
      ),
      dashboardRepository.countBookingsByStatusInRange(
        BookingStatus.cancelled,
        last30Start,
        last30End,
      ),
      dashboardRepository.countBookingsByStatusInRange(
        BookingStatus.cancelled,
        prev30Start,
        prev30End,
      ),
      dashboardRepository.countBookingsByStatusInRange(BookingStatus.pending, today, last30End),
      dashboardRepository.countBookingsByStatusInRange(
        BookingStatus.pending,
        yesterday,
        endOfDay(yesterday),
      ),
      dashboardRepository.aggregateCompletedRevenueInRange(last30Start, last30End),
      dashboardRepository.aggregateCompletedRevenueInRange(prev30Start, prev30End),
      dashboardRepository.findRecentBookings(5),
      dashboardRepository.findRecentActivities(7),
      buildBookingSeries(30),
    ]);

    const countByStatus = Object.fromEntries(
      statusCounts.map((row: { status: string; _count: { _all: number } }) => [
        row.status,
        row._count._all,
      ]),
    ) as Record<string, number>;

    const totalRevenue = revenueAgg._sum.amount?.toNumber() ?? 0;
    const revLast = revenueLast30._sum.amount?.toNumber() ?? 0;
    const revPrev = revenuePrev30._sum.amount?.toNumber() ?? 0;

    return {
      kpis: [
        {
          key: "total",
          label: "Total bookings",
          value: totalBookings.toLocaleString("en-IN"),
          delta: pctChange(bookingsLast30, bookingsPrev30),
          icon: "calendar",
        },
        {
          key: "today",
          label: "Today",
          value: todayBookings.toLocaleString("en-IN"),
          delta: pctChange(todayBookings, yesterdayBookings),
          icon: "clock",
          tone: "accent",
        },
        {
          key: "completed",
          label: "Completed",
          value: (countByStatus.completed ?? 0).toLocaleString("en-IN"),
          delta: pctChange(completedLast30, completedPrev30),
          icon: "check",
        },
        {
          key: "pending",
          label: "Pending",
          value: (countByStatus.pending ?? 0).toLocaleString("en-IN"),
          delta: pctChange(pendingToday, pendingYesterday),
          icon: "hourglass",
          tone: "accent",
        },
        {
          key: "cancelled",
          label: "Cancelled",
          value: (countByStatus.cancelled ?? 0).toLocaleString("en-IN"),
          delta: pctChange(cancelledLast30, cancelledPrev30),
          icon: "x",
        },
        {
          key: "revenue",
          label: "Total revenue",
          value: compactMoney(totalRevenue),
          delta: pctChange(revLast, revPrev),
          icon: "revenue",
        },
        {
          key: "mechanics",
          label: "Active mechanics",
          value: activeMechanics.toLocaleString("en-IN"),
          delta: null,
          icon: "wrench",
        },
        {
          key: "customers",
          label: "New customers",
          value: newCustomers.toLocaleString("en-IN"),
          delta: pctChange(newCustomers, prevNewCustomers),
          icon: "users",
        },
      ],
      series30,
      recentBookings: recentBookings.map(mapBooking),
      activity: activities.map((item: any, index: number) => ({
        id: item.id,
        bookingId: item.booking.bookingNumber,
        text: item.message,
        actor: item.actor,
        ago: timeAgo(item.createdAt),
        status: item.toStatus,
        live: index === 0,
      })),
    };
  },
};
