import { ApiError } from "../../middleware/error-handler.js";
import {
  daysAgoStart,
  endOfDay,
  formatMoney,
  formatScheduledDate,
  pctChange,
  startOfDay,
} from "../../lib/formatters.js";
import {
  buildCustomerWhere,
  customersRepository,
  parseLimit,
  parsePage,
  type CustomerQuery,
  type CustomerRow,
} from "./customers.repository.js";

async function mapCustomer(row: CustomerRow) {
  const bookingsCount = row.bookings.length;
  const totalSpent = row.bookings.reduce((sum, booking) => sum + booking.amount.toNumber(), 0);
  const last = row.bookings[0];
  const vehicles = [...new Set(row.bookings.map((booking) => booking.vehicle))];
  const { date: joinedAt } = formatScheduledDate(row.createdAt);

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? "",
    zone: row.zone ?? "",
    bookingsCount,
    totalSpent,
    totalSpentFormatted: formatMoney(totalSpent),
    lastBooking: last
      ? {
          id: last.bookingNumber,
          service: last.service.name,
          date: formatScheduledDate(last.scheduledAt).date,
        }
      : { id: "—", service: "No bookings", date: "—" },
    vehicles,
    joinedAt,
  };
}

export const customersService = {
  async list(query: CustomerQuery) {
    const page = parsePage(query.page);
    const limit = parseLimit(query.limit);
    const where = buildCustomerWhere(query);
    const direction = query.dir === "asc" ? "asc" : "desc";

    const today = startOfDay(new Date());
    const last30Start = daysAgoStart(29);
    const prev30Start = daysAgoStart(59);
    const prev30End = endOfDay(daysAgoStart(30));
    const last30End = endOfDay(today);

    const [
      customers,
      customersLast30,
      customersPrev30,
      bookingsLast30,
      bookingsPrev30,
      revLast,
      revPrev,
    ] = await Promise.all([
      customersRepository.findMany(where, direction),
      customersRepository.countCreatedInRange(last30Start, last30End),
      customersRepository.countCreatedInRange(prev30Start, prev30End),
      customersRepository.countBookingsInRange(last30Start, last30End),
      customersRepository.countBookingsInRange(prev30Start, prev30End),
      customersRepository.aggregateCompletedRevenueInRange(last30Start, last30End),
      customersRepository.aggregateCompletedRevenueInRange(prev30Start, prev30End),
    ]);

    let mapped = await Promise.all(customers.map(mapCustomer));

    const sortKey = query.sort;
    if (sortKey === "bookingsCount") {
      mapped = mapped.sort((a, b) =>
        direction === "asc" ? a.bookingsCount - b.bookingsCount : b.bookingsCount - a.bookingsCount,
      );
    } else if (sortKey === "totalSpent") {
      mapped = mapped.sort((a, b) =>
        direction === "asc" ? a.totalSpent - b.totalSpent : b.totalSpent - a.totalSpent,
      );
    } else if (sortKey === "joinedAt") {
      mapped = mapped.sort((a, b) =>
        direction === "asc"
          ? a.joinedAt.localeCompare(b.joinedAt)
          : b.joinedAt.localeCompare(a.joinedAt),
      );
    } else if (sortKey === "name") {
      mapped = mapped.sort((a, b) =>
        direction === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
      );
    }

    const total = mapped.length;
    const data = mapped.slice(page * limit, page * limit + limit);

    const summary = mapped.reduce(
      (acc, customer) => {
        acc.totalBookings += customer.bookingsCount;
        acc.totalSpent += customer.totalSpent;
        return acc;
      },
      { totalBookings: 0, totalSpent: 0 },
    );

    const avgLtv = total ? Math.round(summary.totalSpent / total) : 0;
    const completedLast = revLast._count._all;
    const completedPrev = revPrev._count._all;
    const avgTicketLast = completedLast
      ? Math.round((revLast._sum.amount?.toNumber() ?? 0) / completedLast)
      : 0;
    const avgTicketPrev = completedPrev
      ? Math.round((revPrev._sum.amount?.toNumber() ?? 0) / completedPrev)
      : 0;

    return {
      data,
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        totalCustomers: total,
        totalBookings: summary.totalBookings,
        avgLifetimeValue: avgLtv,
        deltas: {
          totalCustomers: pctChange(customersLast30, customersPrev30),
          totalBookings: pctChange(bookingsLast30, bookingsPrev30),
          avgLifetimeValue: pctChange(avgTicketLast, avgTicketPrev),
        },
      },
    };
  },

  async getById(id: string) {
    const customer = await customersRepository.findByIdOrName(id);

    if (!customer) {
      throw new ApiError(404, "Customer not found");
    }

    return mapCustomer(customer);
  },

  async create(input: {
    name?: string;
    phone?: string;
    email?: string;
    zone?: string;
  }) {
    const name = input.name?.trim();
    const phone = input.phone?.trim();
    if (!name || !phone) {
      throw new ApiError(400, "Name and phone are required");
    }

    const customer = await customersRepository.create({
      name,
      phone,
      email: input.email?.trim() || null,
      zone: input.zone?.trim() || null,
    });

    return mapCustomer(customer);
  },
};
