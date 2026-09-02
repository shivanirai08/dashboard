import { compactMoney, mapBooking, timeAgo } from "../../lib/formatters.js";
import { buildBookingSeries } from "../../lib/series.js";
import { dashboardRepository } from "./dashboard.repository.js";

export const dashboardService = {
  async getOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      totalBookings,
      todayBookings,
      statusCounts,
      revenueAgg,
      activeMechanics,
      newCustomers,
      recentBookings,
      activities,
      series30,
    ] = await Promise.all([
      dashboardRepository.countBookings(),
      dashboardRepository.countTodayBookings(),
      dashboardRepository.groupBookingsByStatus(),
      dashboardRepository.aggregateCompletedRevenue(),
      dashboardRepository.countActiveMechanics(),
      dashboardRepository.countNewCustomers(monthAgo),
      dashboardRepository.findRecentBookings(5),
      dashboardRepository.findRecentActivities(7),
      buildBookingSeries(30),
    ]);

    const countByStatus = Object.fromEntries(
      statusCounts.map((row : { status: string; _count: { _all: number } }) => [row.status, row._count._all]),
    ) as Record<string, number>;

    const totalRevenue = revenueAgg._sum.amount?.toNumber() ?? 0;

    return {
      kpis: [
        { key: "total", label: "Total bookings", value: totalBookings.toLocaleString("en-IN"), delta: 8.4, icon: "calendar" },
        { key: "today", label: "Today", value: todayBookings.toLocaleString("en-IN"), delta: 12.1, icon: "clock", tone: "accent" },
        {
          key: "completed",
          label: "Completed",
          value: (countByStatus.completed ?? 0).toLocaleString("en-IN"),
          delta: 6.2,
          icon: "check",
        },
        {
          key: "pending",
          label: "Pending",
          value: (countByStatus.pending ?? 0).toLocaleString("en-IN"),
          delta: -4.8,
          icon: "hourglass",
          tone: "accent",
        },
        {
          key: "cancelled",
          label: "Cancelled",
          value: (countByStatus.cancelled ?? 0).toLocaleString("en-IN"),
          delta: -2.1,
          icon: "x",
        },
        {
          key: "revenue",
          label: "Total revenue",
          value: compactMoney(totalRevenue),
          delta: 11.7,
          icon: "revenue",
        },
        {
          key: "mechanics",
          label: "Active mechanics",
          value: activeMechanics.toLocaleString("en-IN"),
          delta: 3.0,
          icon: "wrench",
        },
        {
          key: "customers",
          label: "New customers",
          value: newCustomers.toLocaleString("en-IN"),
          delta: 9.6,
          icon: "users",
        },
      ],
      series30,
      recentBookings: recentBookings.map(mapBooking),
      activity: activities.map((item : any, index : number) => ({
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
