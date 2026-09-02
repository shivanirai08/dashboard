import { MechanicStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type MechanicQuery = {
  q?: string;
  status?: string;
};

const bookingSelect = {
  bookingNumber: true,
  status: true,
  scheduledAt: true,
  service: { select: { name: true } },
  customer: { select: { name: true } },
} as const;

export const mechanicsRepository = {
  findMany(where: Prisma.MechanicWhereInput) {
    return prisma.mechanic.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        bookings: {
          orderBy: { scheduledAt: "desc" },
          take: 8,
          select: bookingSelect,
        },
      },
    });
  },

  findByIdOrName(id: string) {
    return prisma.mechanic.findFirst({
      where: {
        OR: [{ id }, { name: { equals: id, mode: "insensitive" } }],
      },
      include: {
        bookings: {
          orderBy: { scheduledAt: "desc" },
          take: 10,
          select: bookingSelect,
        },
      },
    });
  },

  groupByStatus() {
    return prisma.mechanic.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
  },

  create(data: {
    name: string;
    phone: string;
    zone: string;
    specialties?: string[];
    status?: MechanicStatus;
    since?: number;
  }) {
    return prisma.mechanic.create({
      data: {
        name: data.name,
        phone: data.phone,
        zone: data.zone,
        specialties: data.specialties ?? [],
        status: data.status ?? MechanicStatus.available,
        since: data.since ?? new Date().getFullYear(),
      },
      include: {
        bookings: {
          orderBy: { scheduledAt: "desc" },
          take: 8,
          select: bookingSelect,
        },
      },
    });
  },
};

export function buildMechanicWhere(query: MechanicQuery): Prisma.MechanicWhereInput {
  const where: Prisma.MechanicWhereInput = {};

  if (query.status && query.status !== "all") {
    where.status = query.status as MechanicStatus;
  }

  if (query.q?.trim()) {
    const q = query.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { zone: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

export type MechanicRow = Awaited<ReturnType<typeof mechanicsRepository.findMany>>[number];
