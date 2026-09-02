import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { bookingInclude } from "../../lib/formatters.js";

export type BookingQuery = {
  q?: string;
  status?: string;
  service?: string;
  mechanic?: string;
  sort?: string;
  dir?: string;
  page?: string;
  limit?: string;
};

export const bookingsRepository = {
  count(where: Prisma.BookingWhereInput) {
    return prisma.booking.count({ where });
  },

  findMany(
    where: Prisma.BookingWhereInput,
    orderBy: Prisma.BookingOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    return prisma.booking.findMany({
      where,
      orderBy,
      skip,
      take,
      include: bookingInclude,
    });
  },

  findByIdOrNumber(id: string) {
    return prisma.booking.findFirst({
      where: {
        OR: [{ id }, { bookingNumber: id }],
      },
      include: {
        ...bookingInclude,
        customer: { select: { name: true, phone: true, email: true, zone: true } },
        activities: { orderBy: { createdAt: "asc" } },
      },
    });
  },

  groupByStatus() {
    return prisma.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
  },

  findServiceNames() {
    return prisma.serviceCategory.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    });
  },

  findMechanicNames() {
    return prisma.mechanic.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    });
  },
};

export type SortKey = "id" | "customer" | "service" | "mechanic" | "amount" | "date";

export function buildBookingOrderBy(
  sort: string | undefined,
  dir: string | undefined,
): Prisma.BookingOrderByWithRelationInput {
  const direction = dir === "asc" ? "asc" : "desc";
  const key = sort as SortKey | undefined;

  switch (key) {
    case "id":
      return { bookingNumber: direction };
    case "customer":
      return { customer: { name: direction } };
    case "service":
      return { service: { name: direction } };
    case "mechanic":
      return { mechanic: { name: direction } };
    case "amount":
      return { amount: direction };
    case "date":
    default:
      return { scheduledAt: direction };
  }
}

export function buildBookingWhere(query: BookingQuery): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};

  if (query.status && query.status !== "all") {
    where.status = query.status as BookingStatus;
  }

  if (query.service && query.service !== "all") {
    where.service = { name: query.service };
  }

  if (query.mechanic && query.mechanic !== "all") {
    where.mechanic = { name: query.mechanic };
  }

  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { bookingNumber: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { vehicle: { contains: q, mode: "insensitive" } },
      { plate: { contains: q, mode: "insensitive" } },
      { service: { name: { contains: q, mode: "insensitive" } } },
      { mechanic: { name: { contains: q, mode: "insensitive" } } },
      { location: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

export function parsePage(value: string | undefined, fallback = 0): number {
  const page = Number(value);
  return Number.isFinite(page) && page >= 0 ? page : fallback;
}

export function parseLimit(value: string | undefined, fallback = 10): number {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(limit, 1), 100);
}
