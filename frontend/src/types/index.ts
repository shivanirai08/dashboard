export type BookingStatus =
  | "pending"
  | "assigned"
  | "on_the_way"
  | "completed"
  | "cancelled";

export type MechanicStatus = "available" | "on_job" | "offline";

export type Booking = {
  id: string;
  customer: string;
  phone: string;
  vehicle: string;
  plate: string;
  service: string;
  mechanic: string | null;
  status: BookingStatus;
  amount: number;
  date: string;
  time: string;
  location: string;
};

export type Mechanic = {
  id: string;
  name: string;
  status: MechanicStatus;
  jobsCompleted: number;
  rating: number;
  zone: string;
  phone: string;
  since: string;
  currentBooking: { id: string; service: string; customer: string } | null;
  lastBooking: { id: string; service: string; customer: string };
  specialties: string[];
};

export type SeriesPoint = {
  label: string;
  full: string;
  bookings: number;
  completed: number;
  revenue: number;
};

export type Kpi = {
  key: string;
  label: string;
  value: string;
  delta: number;
  icon: "calendar" | "clock" | "check" | "hourglass" | "x" | "revenue" | "wrench" | "users";
  tone?: "accent" | "neutral";
};

export type Activity = {
  id: string;
  bookingId: string;
  text: string;
  actor: string;
  ago: string;
  status: BookingStatus;
  live?: boolean;
};

export type DataMode = "loading" | "ready" | "empty" | "error";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  zone: string;
  bookingsCount: number;
  totalSpent: number;
  lastBooking: { id: string; service: string; date: string };
  vehicles: string[];
  joinedAt: string;
};
