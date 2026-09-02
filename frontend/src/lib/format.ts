import type { BookingStatus, MechanicStatus } from "@/types";

export const statusLabel: Record<BookingStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  on_the_way: "On the way",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const mechanicStatusLabel: Record<MechanicStatus, string> = {
  available: "Available",
  on_job: "On job",
  offline: "Offline",
};

export function money(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function compactMoney(n: number): string {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatTodaySubtitle(): string {
  const now = new Date();
  return now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }) + " · India ops";
}
