import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type CustomerQuery = {
  q?: string;
  sort?: string;
  dir?: string;
  page?: string;
  limit?: string;
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
  findMany(where: Prisma.CustomerWhereInput, direction: "asc" | "desc") {
    return prisma.customer.findMany({
      where,
      orderBy: { name: direction },
      include: {
        bookings: {
          orderBy: { scheduledAt: "desc" },
          select: bookingSelect,
        },
      },
    });
  },

  findByIdOrName(id: string) {
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
    });
  },
};

export function buildCustomerWhere(query: CustomerQuery): Prisma.CustomerWhereInput {
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

export type CustomerRow = Awaited<ReturnType<typeof customersRepository.findMany>>[number];
