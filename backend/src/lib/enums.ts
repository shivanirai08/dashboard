/** Local status unions — avoid brittle `@prisma/client` enum imports in the IDE. */
export const BookingStatus = {
  pending: "pending",
  assigned: "assigned",
  on_the_way: "on_the_way",
  completed: "completed",
  cancelled: "cancelled",
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const MechanicStatus = {
  available: "available",
  on_job: "on_job",
  offline: "offline",
} as const;

export type MechanicStatus = (typeof MechanicStatus)[keyof typeof MechanicStatus];
