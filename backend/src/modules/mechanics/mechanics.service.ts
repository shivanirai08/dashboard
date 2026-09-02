import { MechanicStatus } from "../../lib/enums.js";
import { ApiError } from "../../middleware/error-handler.js";
import { makeEvent } from "../../realtime/events.js";
import { broadcast } from "../../realtime/ws.js";
import {
  buildMechanicWhere,
  mechanicsRepository,
  type MechanicQuery,
  type MechanicRow,
} from "./mechanics.repository.js";

function mapMechanic(row: MechanicRow) {
  const active = row.bookings.find(
    (booking) => booking.status === "assigned" || booking.status === "on_the_way",
  );
  const last =
    row.bookings.find((booking) => booking.status === "completed") ??
    row.bookings[0] ??
    null;

  return {
    id: row.id,
    name: row.name,
    status: row.status as MechanicStatus,
    jobsCompleted: row.jobsCompleted,
    rating: row.rating,
    zone: row.zone,
    phone: row.phone,
    since: String(row.since),
    specialties: row.specialties,
    currentBooking: active
      ? {
          id: active.bookingNumber,
          service: active.service.name,
          customer: active.customer.name,
        }
      : null,
    lastBooking: last
      ? {
          id: last.bookingNumber,
          service: last.service.name,
          customer: last.customer.name,
        }
      : { id: "—", service: "No jobs yet", customer: "—" },
  };
}

export const mechanicsService = {
  async list(query: MechanicQuery) {
    const where = buildMechanicWhere(query);
    const mechanics = await mechanicsRepository.findMany(where);

    return {
      data: mechanics.map(mapMechanic),
      meta: { total: mechanics.length },
    };
  },

  async getById(id: string) {
    const mechanic = await mechanicsRepository.findByIdOrName(id);

    if (!mechanic) {
      throw new ApiError(404, "Mechanic not found");
    }

    return mapMechanic(mechanic);
  },

  async getStatusCounts() {
    const rows = await mechanicsRepository.groupByStatus();

    const counts = {
      all: 0,
      available: 0,
      on_job: 0,
      offline: 0,
    };

    for (const row of rows) {
      counts[row.status] = row._count._all;
      counts.all += row._count._all;
    }

    return counts;
  },

  async create(input: {
    name?: string;
    phone?: string;
    zone?: string;
    specialties?: string[];
  }) {
    const name = input.name?.trim();
    const phone = input.phone?.trim();
    const zone = input.zone?.trim();
    if (!name || !phone || !zone) {
      throw new ApiError(400, "Name, phone and zone are required");
    }

    const mechanic = await mechanicsRepository.create({
      name,
      phone,
      zone,
      specialties: Array.isArray(input.specialties)
        ? input.specialties.map((s) => String(s).trim()).filter(Boolean)
        : [],
    });

    const mapped = mapMechanic(mechanic);
    broadcast(
      makeEvent("mechanic.created", `Mechanic ${mapped.name} joined the fleet`, {
        id: mapped.id,
        name: mapped.name,
      }),
    );
    return mapped;
  },
};
