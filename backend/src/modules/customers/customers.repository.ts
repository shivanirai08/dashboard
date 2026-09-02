import { prisma } from "../../lib/prisma.js";

export type CustomerQuery = {
  q?: string;
  sort?: string;
  dir?: string;
  page?: string;
  limit?: string;
};

/** Keep where typing local so the IDE doesn't depend on a flaky Prisma namespace export. */
export type CustomerWhereInput = {
  OR?: Array<{
    name?: { contains: string; mode: "insensitive" };
    phone?: { contains: string; mode: "insensitive" };
    email?: { contains: string; mode: "insensitive" };
    zone?: { contains: string; mode: "insensitive" };
    id?: string;
  }>;
};

type CustomerBookingRow = {
  bookingNumber: string;
  amount: { toNumber(): number };
  scheduledAt: Date;
  vehicle: string;
  service: { name: string };
  status?: string;
};

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  zone: string | null;
  createdAt: Date;
  updatedAt: Date;
  bookings: CustomerBookingRow[];
};

const bookingSelect = {
  bookingNumber: true,
  amount: true,
  scheduledAt: true,
  vehicle: true,
  service: { select: { name: true } },
} as const;

const bookingDetailSelect = {
  ...bookingSelect,
  status: true,
} as const;

export const customersRepository = {
  findMany(where: CustomerWhereInput, direction: "asc" | "desc"): Promise<CustomerRow[]> {
    return prisma.customer.findMany({
      where,
      orderBy: { name: direction },
      include: {
        bookings: {
          orderBy: { scheduledAt: "desc" },
          select: bookingSelect,
        },
      },
    }) as Promise<CustomerRow[]>;
  },

  findByIdOrName(id: string): Promise<CustomerRow | null> {
    return prisma.customer.findFirst({
      where: {
        OR: [{ id }, { name: { contains: id, mode: "insensitive" } }],
      },
      include: {
        bookings: {
          orderBy: { scheduledAt: "desc" },
          select: bookingDetailSelect,
        },
      },
    }) as Promise<CustomerRow | null>;
  },

  create(data: {
    name: string;
    phone: string;
    email?: string | null;
    zone?: string | null;
  }): Promise<CustomerRow> {
    return prisma.customer.create({
      data,
      include: {
        bookings: {
          orderBy: { scheduledAt: "desc" },
          select: bookingSelect,
        },
      },
    }) as Promise<CustomerRow>;
  },

  countCreatedInRange(start: Date, end: Date) {
    return prisma.customer.count({
      where: { createdAt: { gte: start, lte: end } },
    });
  },

  countBookingsInRange(start: Date, end: Date) {
    return prisma.booking.count({
      where: { scheduledAt: { gte: start, lte: end } },
    });
  },

  aggregateCompletedRevenueInRange(start: Date, end: Date) {
    return prisma.booking.aggregate({
      where: {
        status: "completed",
        scheduledAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });
  },
};

export function buildCustomerWhere(query: CustomerQuery): CustomerWhereInput {
  if (!query.q?.trim()) return {};

  const q = query.q.trim();
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { zone: { contains: q, mode: "insensitive" } },
    ],
  };
}

export function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isFinite(page) && page >= 0 ? page : 0;
}

export function parseLimit(value: string | undefined): number {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return 10;
  return Math.min(Math.max(limit, 1), 100);
}
