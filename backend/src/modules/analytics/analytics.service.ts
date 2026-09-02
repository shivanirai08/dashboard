import { formatMoney } from "../../lib/formatters.js";
import { buildBookingSeries } from "../../lib/series.js";
import {
  analyticsRepository,
  parseAnalyticsRange,
  rangeLabel,
  STATUS_LABELS,
  sumBookingTotals,
} from "./analytics.repository.js";

export const analyticsService = {
  async getAnalytics(rangeParam?: string) {
    const days = parseAnalyticsRange(rangeParam);
    const { start, end } = analyticsRepository.dateRangeForDays(days);

    const [bookingsInRange, statusBreakdown, serviceGroups, series] = await Promise.all([
      analyticsRepository.findBookingsInRange(start, end),
      analyticsRepository.groupBookingsByStatusInRange(start, end),
      analyticsRepository.groupBookingsByService(start, end, 8),
      buildBookingSeries(days),
    ]);

    const services = await analyticsRepository.findServicesByIds(
      serviceGroups.map((row) => row.serviceId),
    );
    const serviceNameById = new Map(services.map((service) => [service.id, service.name]));

    const totals = sumBookingTotals(bookingsInRange);

    return {
      range: rangeLabel(days),
      totals: {
        bookings: totals.bookings,
        revenue: totals.revenue,
        completionRate: totals.bookings
          ? Math.round((totals.completed / totals.bookings) * 100)
          : 0,
      },
      series,
      statusBreakdown: statusBreakdown.map((row) => ({
        key: row.status,
        name: STATUS_LABELS[row.status] ?? row.status,
        value: row._count._all,
      })),
      serviceBreakdown: serviceGroups.map((row) => ({
        name: serviceNameById.get(row.serviceId) ?? "Unknown",
        value: row._count._all,
      })),
      revenueFormatted: formatMoney(totals.revenue),
    };
  },
};
