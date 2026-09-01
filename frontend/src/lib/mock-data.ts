import type {
  Activity,
  Booking,
  BookingStatus,
  Kpi,
  Mechanic,
  MechanicStatus,
  SeriesPoint,
} from "@/types";

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

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function buildSeries(days: number): SeriesPoint[] {
  const rand = rng(20260214 + days);
  const out: SeriesPoint[] = [];
  const end = new Date(2026, 1, 14);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const base = weekend ? 46 : 68;
    const drift = ((days - i) / days) * 18;
    const bookings = Math.round(base + drift + rand() * 22);
    const completed = Math.round(bookings * (0.72 + rand() * 0.12));
    const revenue = Math.round(completed * (118 + rand() * 46));
    out.push({
      label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
      full: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      bookings,
      completed,
      revenue,
    });
  }
  return out;
}

export const series7 = buildSeries(7);
export const series30 = buildSeries(30);
export const series90 = buildSeries(90);

export function seriesFor(range: "7d" | "30d" | "90d"): SeriesPoint[] {
  if (range === "7d") return series7;
  if (range === "90d") return series90;
  return series30;
}

export const kpis: Kpi[] = [
  { key: "total", label: "Total bookings", value: "12,486", delta: 8.4, icon: "calendar" },
  { key: "today", label: "Today", value: "184", delta: 12.1, icon: "clock", tone: "accent" },
  { key: "completed", label: "Completed", value: "9,812", delta: 6.2, icon: "check" },
  { key: "pending", label: "Pending", value: "37", delta: -4.8, icon: "hourglass", tone: "accent" },
  { key: "cancelled", label: "Cancelled", value: "412", delta: -2.1, icon: "x" },
  { key: "revenue", label: "Total revenue", value: "$1.42M", delta: 11.7, icon: "revenue" },
  { key: "mechanics", label: "Active mechanics", value: "48", delta: 3.0, icon: "wrench" },
  { key: "customers", label: "New customers", value: "326", delta: 9.6, icon: "users" },
];

const CUSTOMERS = [
  ["Marcus Adeyemi", "+1 415 220 8841"],
  ["Priya Raman", "+1 415 662 0193"],
  ["Dana Whitfield", "+1 628 331 7742"],
  ["Tomas Herrera", "+1 510 887 2210"],
  ["Yuki Nakamura", "+1 650 449 1187"],
  ["Elena Sorokina", "+1 415 908 3320"],
  ["Jamal Bright", "+1 707 214 9985"],
  ["Grace Okonkwo", "+1 415 773 6612"],
  ["Ben Kowalski", "+1 925 330 4471"],
  ["Aisha Rahman", "+1 415 118 2098"],
  ["Owen Petersen", "+1 408 552 7719"],
  ["Camila Duarte", "+1 415 660 8834"],
];

const VEHICLES = [
  ["Toyota Hilux 2019", "7KLM 224"],
  ["Ford Transit 2021", "8RTV 902"],
  ["Honda Civic 2018", "6BQD 471"],
  ["Tesla Model 3 2022", "9XZP 118"],
  ["Isuzu D-Max 2020", "5NNC 663"],
  ["VW Golf 2017", "4TTG 209"],
  ["Nissan Navara 2021", "7PLK 550"],
  ["Mercedes Sprinter 2020", "3HDW 887"],
];

const SERVICES = [
  "Battery jump-start",
  "Flat tyre change",
  "Engine diagnostics",
  "Fuel delivery",
  "Brake repair",
  "Towing",
  "Lockout assist",
  "Oil & fluids",
];

const MECHANIC_NAMES = [
  "Ray Kowalczyk",
  "Sofia Almeida",
  "Dev Patel",
  "Nina Osei",
  "Luis Ferrer",
  "Hana Kim",
  "Bruno Castellan",
  "Amira Haddad",
];

const STATUSES: BookingStatus[] = [
  "pending",
  "assigned",
  "on_the_way",
  "completed",
  "completed",
  "completed",
  "cancelled",
];

function buildBookings(count: number): Booking[] {
  const rand = rng(770419);
  const out: Booking[] = [];
  for (let i = 0; i < count; i++) {
    const status = STATUSES[Math.floor(rand() * STATUSES.length)];
    const [customer, phone] = CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)];
    const [vehicle, plate] = VEHICLES[Math.floor(rand() * VEHICLES.length)];
    const service = SERVICES[Math.floor(rand() * SERVICES.length)];
    const mechanic =
      status === "pending" ? null : MECHANIC_NAMES[Math.floor(rand() * MECHANIC_NAMES.length)];
    const d = new Date(2026, 1, 14);
    d.setDate(d.getDate() - Math.floor(i / 4));
    const hour = 7 + Math.floor(rand() * 13);
    const minute = Math.floor(rand() * 4) * 15;
    out.push({
      id: `IM-${(48210 - i).toString()}`,
      customer,
      phone,
      vehicle,
      plate,
      service,
      mechanic,
      status,
      amount: Math.round(64 + rand() * 380),
      date: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      location: ["Mission District", "Oakland Hwy 24", "Daly City", "SOMA", "Berkeley", "Fremont"][
        Math.floor(rand() * 6)
      ],
    });
  }
  return out;
}

export const bookings = buildBookings(96);
export const recentBookings = bookings.slice(0, 5);

function buildMechanics(): Mechanic[] {
  const rand = rng(31337);
  const statuses: MechanicStatus[] = [
    "on_job",
    "available",
    "on_job",
    "available",
    "offline",
    "on_job",
    "available",
    "offline",
    "on_job",
    "available",
    "on_job",
    "available",
  ];
  const names = [
    ...MECHANIC_NAMES,
    "Marta Silva",
    "Kofi Mensah",
    "Ivan Petrov",
    "Leila Zhou",
  ];
  const zones = ["Mission", "Oakland", "Daly City", "SOMA", "Berkeley", "Fremont"];
  return names.map((name, i) => {
    const status = statuses[i % statuses.length];
    const b = bookings[i * 3];
    const prev = bookings[i * 3 + 1];
    return {
      id: `MCH-${(1200 + i).toString()}`,
      name,
      status,
      jobsCompleted: 180 + Math.floor(rand() * 640),
      rating: Number((4.2 + rand() * 0.8).toFixed(1)),
      zone: zones[i % zones.length],
      phone: `+1 415 ${(200 + i * 7).toString()} ${(1100 + i * 13).toString()}`,
      since: `${2019 + (i % 5)}`,
      currentBooking:
        status === "on_job"
          ? { id: b.id, service: b.service, customer: b.customer }
          : null,
      lastBooking: { id: prev.id, service: prev.service, customer: prev.customer },
      specialties: [SERVICES[i % SERVICES.length], SERVICES[(i + 3) % SERVICES.length]],
    };
  });
}

export const mechanics = buildMechanics();

export const statusBreakdown: { key: BookingStatus; name: string; value: number }[] = [
  { key: "pending", name: "Pending", value: 372 },
  { key: "assigned", name: "Assigned", value: 486 },
  { key: "on_the_way", name: "On the way", value: 291 },
  { key: "completed", name: "Completed", value: 9812 },
  { key: "cancelled", name: "Cancelled", value: 412 },
];

export const serviceBreakdown = [
  { name: "Battery jump-start", value: 2841 },
  { name: "Flat tyre change", value: 2264 },
  { name: "Towing", value: 1907 },
  { name: "Engine diagnostics", value: 1502 },
  { name: "Fuel delivery", value: 1188 },
  { name: "Lockout assist", value: 934 },
  { name: "Brake repair", value: 812 },
  { name: "Oil & fluids", value: 604 },
];

export const activity: Activity[] = [
  {
    id: "a1",
    bookingId: "IM-48210",
    text: "Ray Kowalczyk is on the way to Mission District",
    actor: "Ray Kowalczyk",
    ago: "just now",
    status: "on_the_way",
    live: true,
  },
  {
    id: "a2",
    bookingId: "IM-48209",
    text: "Battery jump-start completed for Priya Raman",
    actor: "Sofia Almeida",
    ago: "2 min",
    status: "completed",
  },
  {
    id: "a3",
    bookingId: "IM-48208",
    text: "New booking created — Towing, Oakland Hwy 24",
    actor: "Dispatch",
    ago: "6 min",
    status: "pending",
  },
  {
    id: "a4",
    bookingId: "IM-48206",
    text: "Dev Patel assigned to engine diagnostics",
    actor: "Dispatch",
    ago: "11 min",
    status: "assigned",
  },
  {
    id: "a5",
    bookingId: "IM-48203",
    text: "Customer cancelled — fuel delivery, Daly City",
    actor: "Tomas Herrera",
    ago: "18 min",
    status: "cancelled",
  },
  {
    id: "a6",
    bookingId: "IM-48201",
    text: "Flat tyre change completed for Dana Whitfield",
    actor: "Nina Osei",
    ago: "24 min",
    status: "completed",
  },
  {
    id: "a7",
    bookingId: "IM-48198",
    text: "Hana Kim marked available in Berkeley",
    actor: "Hana Kim",
    ago: "31 min",
    status: "assigned",
  },
];

export function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export function compactMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n}`;
}
