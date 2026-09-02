import { ApiError } from "../../middleware/error-handler.js";
import { formatScheduledDate, mapBooking } from "../../lib/formatters.js";
import {
  bookingsRepository,
  buildBookingOrderBy,
  buildBookingWhere,
  parseLimit,
  parsePage,
  type BookingQuery,
} from "./bookings.repository.js";

export const bookingsService = {
  async list(query: BookingQuery) {
    const page = parsePage(query.page);
    const limit = parseLimit(query.limit);
    const where = buildBookingWhere(query);
    const orderBy = buildBookingOrderBy(query.sort, query.dir);

    const [total, rows] = await Promise.all([
      bookingsRepository.count(where),
      bookingsRepository.findMany(where, orderBy, page * limit, limit),
    ]);

    return {
      data: rows.map(mapBooking),
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  async getById(id: string) {
    const booking = await bookingsRepository.findByIdOrNumber(id);

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    const { date, time } = formatScheduledDate(booking.scheduledAt);

    return {
      ...mapBooking(booking),
      email: booking.customer.email,
      zone: booking.customer.zone,
      timeline: booking.activities.map((activity) => ({
        id: activity.id,
        fromStatus: activity.fromStatus,
        toStatus: activity.toStatus,
        message: activity.message,
        actor: activity.actor,
        at: activity.createdAt.toISOString(),
      })),
      scheduledAt: booking.scheduledAt.toISOString(),
      date,
      time,
    };
  },

  async getStatusCounts() {
    const rows = await bookingsRepository.groupByStatus();

    const counts: Record<string, number> = { all: 0 };
    for (const row of rows) {
      counts[row.status] = row._count._all;
      counts.all += row._count._all;
    }
    return counts;
  },

  async getFilters() {
    const [services, mechanics] = await Promise.all([
      bookingsRepository.findServiceNames(),
      bookingsRepository.findMechanicNames(),
    ]);

    return {
      services: services.map((service) => service.name),
      mechanics: mechanics.map((mechanic) => mechanic.name),
    };
  },
};
