import { BookingStatus } from "../../lib/enums.js";
import { ApiError } from "../../middleware/error-handler.js";
import { formatScheduledDate, mapBooking } from "../../lib/formatters.js";
import { makeEvent } from "../../realtime/events.js";
import { broadcast } from "../../realtime/ws.js";
import {
  bookingsRepository,
  buildBookingOrderBy,
  buildBookingWhere,
  parseLimit,
  parsePage,
  type BookingQuery,
} from "./bookings.repository.js";

export type CreateBookingInput = {
  customerName: string;
  phone: string;
  email?: string;
  zone?: string;
  vehicle: string;
  plate: string;
  service: string;
  location: string;
  mechanic?: string;
  amount?: number;
  scheduledAt?: string;
};

export type ReassignBookingInput = {
  mechanic: string;
};

export type UpdateStatusInput = {
  status: string;
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  on_the_way: "On the way",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: [BookingStatus.assigned, BookingStatus.cancelled],
  assigned: [BookingStatus.on_the_way, BookingStatus.cancelled],
  on_the_way: [BookingStatus.completed, BookingStatus.cancelled],
  completed: [],
  cancelled: [],
};

function isBookingStatus(value: string): value is BookingStatus {
  return Object.values(BookingStatus).includes(value as BookingStatus);
}

type BookingActivityRow = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  message: string;
  actor: string;
  createdAt: Date;
};

type BookingDetailRow = {
  scheduledAt: Date;
  customer: { email: string | null; zone: string | null; name: string; phone: string };
  activities: BookingActivityRow[];
} & Parameters<typeof mapBooking>[0];

function mapTimeline(activities: BookingActivityRow[]) {
  return activities.map((activity) => ({
    id: activity.id,
    fromStatus: activity.fromStatus,
    toStatus: activity.toStatus,
    message: activity.message,
    actor: activity.actor,
    at: activity.createdAt.toISOString(),
  }));
}

function statusLabelOf(status: BookingStatus): string {
  return STATUS_LABEL[status];
}

function detailPayload(updated: BookingDetailRow) {
  const { date, time } = formatScheduledDate(updated.scheduledAt);
  return {
    ...mapBooking(updated),
    email: updated.customer.email,
    zone: updated.customer.zone,
    timeline: mapTimeline(updated.activities),
    scheduledAt: updated.scheduledAt.toISOString(),
    date,
    time,
  };
}

async function nextBookingNumber() {
  const latest = await bookingsRepository.findLatestBookingNumber();
  const match = latest?.bookingNumber.match(/IM-(\d+)/);
  const next = match ? Number(match[1]) + 1 : 48_210;
  return `IM-${next}`;
}

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
      timeline: mapTimeline(booking.activities as BookingActivityRow[]),
      scheduledAt: booking.scheduledAt.toISOString(),
      date,
      time,
    };
  },

  async getStatusCounts() {
    const rows = await bookingsRepository.groupByStatus();

    const counts: Record<string, number> = { all: 0 };
    for (const row of rows as Array<{ status: string; _count: { _all: number } }>) {
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
      services: (services as Array<{ name: string }>).map((service) => service.name),
      mechanics: (mechanics as Array<{ name: string }>).map((mechanic) => mechanic.name),
    };
  },

  async create(input: CreateBookingInput) {
    const customerName = input.customerName?.trim();
    const phone = input.phone?.trim();
    const vehicle = input.vehicle?.trim();
    const plate = input.plate?.trim();
    const serviceName = input.service?.trim();
    const location = input.location?.trim();

    if (!customerName || !phone || !vehicle || !plate || !serviceName || !location) {
      throw new ApiError(400, "Missing required booking fields");
    }

    const service = await bookingsRepository.findServiceByName(serviceName);
    if (!service) {
      throw new ApiError(400, "Unknown service category");
    }

    let customer = await bookingsRepository.findCustomerByPhone(phone);
    if (!customer) {
      customer = await bookingsRepository.createCustomer({
        name: customerName,
        phone,
        email: input.email?.trim() || null,
        zone: input.zone?.trim() || null,
      });
    }

    let mechanicId: string | null = null;
    let mechanicName: string | null = null;
    if (input.mechanic?.trim()) {
      const mechanic = await bookingsRepository.findMechanicByIdOrName(input.mechanic.trim());
      if (!mechanic) {
        throw new ApiError(400, "Mechanic not found");
      }
      mechanicId = mechanic.id;
      mechanicName = mechanic.name;
    }

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : new Date();
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new ApiError(400, "Invalid scheduledAt");
    }

    const amount =
      typeof input.amount === "number" && Number.isFinite(input.amount)
        ? input.amount
        : service.basePrice.toNumber();

    const status = mechanicId ? BookingStatus.assigned : BookingStatus.pending;
    const bookingNumber = await nextBookingNumber();

    const booking = await bookingsRepository.create({
      bookingNumber,
      vehicle,
      plate,
      status,
      amount,
      scheduledAt,
      location,
      customer: { connect: { id: customer.id } },
      service: { connect: { id: service.id } },
      ...(mechanicId ? { mechanic: { connect: { id: mechanicId } } } : {}),
      activities: {
        create: [
          {
            fromStatus: null,
            toStatus: BookingStatus.pending,
            message: `New booking created — ${service.name}`,
            actor: "Dispatch",
          },
          ...(mechanicId
            ? [
                {
                  fromStatus: BookingStatus.pending,
                  toStatus: BookingStatus.assigned,
                  message: `${mechanicName} assigned to ${service.name.toLowerCase()}`,
                  actor: "Dispatch",
                },
              ]
            : []),
        ],
      },
    });

    const mapped = mapBooking(booking);
    broadcast(
      makeEvent(
        "booking.created",
        `${mapped.customer} booked ${mapped.service} · ${mapped.id}`,
        { id: mapped.id, status: mapped.status, customer: mapped.customer },
      ),
    );
    return mapped;
  },

  async reassign(id: string, input: ReassignBookingInput) {
    const booking = await bookingsRepository.findByIdOrNumber(id);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    const mechanic = await bookingsRepository.findMechanicByIdOrName(input.mechanic?.trim() ?? "");
    if (!mechanic) {
      throw new ApiError(400, "Mechanic not found");
    }

    const fromStatus = booking.status as BookingStatus;
    const toStatus: BookingStatus =
      booking.status === BookingStatus.pending ? BookingStatus.assigned : fromStatus;

    const updated = await bookingsRepository.update(booking.id, {
      mechanic: { connect: { id: mechanic.id } },
      status: toStatus,
      activities: {
        create: {
          fromStatus,
          toStatus,
          message: `${mechanic.name} assigned to ${booking.service.name.toLowerCase()}`,
          actor: "Dispatch",
        },
      },
    });

    const result = detailPayload(updated as BookingDetailRow);

    broadcast(
      makeEvent(
        "booking.updated",
        `${mechanic.name} assigned to ${result.id} · ${statusLabelOf(fromStatus)} → ${statusLabelOf(toStatus)}`,
        { id: result.id, status: result.status, mechanic: mechanic.name },
      ),
    );

    return result;
  },

  async updateStatus(id: string, input: UpdateStatusInput) {
    const booking = await bookingsRepository.findByIdOrNumber(id);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    const next = input.status?.trim() ?? "";
    if (!isBookingStatus(next)) {
      throw new ApiError(400, "Invalid status");
    }

    const fromStatus = booking.status as BookingStatus;
    if (fromStatus === next) {
      return this.getById(id);
    }

    const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(next)) {
      throw new ApiError(
        400,
        `Cannot move ${statusLabelOf(fromStatus)} → ${statusLabelOf(next)}`,
      );
    }

    if (next === BookingStatus.assigned && !booking.mechanicId) {
      throw new ApiError(400, "Assign a mechanic before marking Assigned");
    }

    const message =
      next === BookingStatus.cancelled
        ? `${booking.bookingNumber} cancelled`
        : next === BookingStatus.completed
          ? `${booking.bookingNumber} completed`
          : next === BookingStatus.on_the_way
            ? `${booking.mechanic?.name ?? "Mechanic"} is on the way · ${booking.bookingNumber}`
            : `${booking.bookingNumber} marked ${statusLabelOf(next)}`;

    const updated = await bookingsRepository.update(booking.id, {
      status: next,
      activities: {
        create: {
          fromStatus,
          toStatus: next,
          message,
          actor: "Dispatch",
        },
      },
    });

    const result = detailPayload(updated as BookingDetailRow);

    broadcast(
      makeEvent(
        "booking.updated",
        `${message} · ${statusLabelOf(fromStatus)} → ${statusLabelOf(next)}`,
        {
          id: result.id,
          status: result.status,
          fromStatus,
          toStatus: next,
        },
      ),
    );

    return result;
  },
};
