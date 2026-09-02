import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type BookingStatus =
  | "pending"
  | "assigned"
  | "on_the_way"
  | "completed"
  | "cancelled";

type MechanicStatus = "available" | "on_job" | "offline";

type ActivityDraft = {
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  message: string;
  actor: string;
  createdAt: Date;
};

type BookingSeedRow = {
  bookingNumber: string;
  customerId: string;
  mechanicId: string | null;
  serviceId: string;
  vehicle: string;
  plate: string;
  status: BookingStatus;
  amount: number;
  scheduledAt: Date;
  location: string;
  createdAt: Date;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
};

type MechanicRow = {
  id: string;
  name: string;
};

type ServiceRow = {
  id: string;
  name: string;
};

type BookingWithRelations = {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  scheduledAt: Date;
  service: { name: string };
  mechanic: { name: string } | null;
};

const BookingStatus = {
  pending: "pending",
  assigned: "assigned",
  on_the_way: "on_the_way",
  completed: "completed",
  cancelled: "cancelled",
} as const satisfies Record<string, BookingStatus>;

const MechanicStatus = {
  available: "available",
  on_job: "on_job",
  offline: "offline",
} as const satisfies Record<string, MechanicStatus>;

const BATCH_SIZE = 100;
const CUSTOMER_COUNT = 55;
const BOOKING_COUNT = 520;

/** Anchor seed bookings to "today" so analytics/dashboard date windows match. */
function seedEndDate(): Date {
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  return d;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const ZONES = [
  "Andheri West, Mumbai",
  "Koramangala, Bengaluru",
  "Connaught Place, Delhi",
  "HSR Layout, Bengaluru",
  "Bandra, Mumbai",
  "Powai, Mumbai",
  "Indiranagar, Bengaluru",
  "Saket, Delhi",
  "Gachibowli, Hyderabad",
  "Banjara Hills, Hyderabad",
  "Viman Nagar, Pune",
  "Salt Lake, Kolkata",
] as const;

const SERVICES = [
  { name: "Battery jump-start", basePrice: 499 },
  { name: "Flat tyre change", basePrice: 599 },
  { name: "Engine diagnostics", basePrice: 899 },
  { name: "Fuel delivery", basePrice: 449 },
  { name: "Brake repair", basePrice: 1499 },
  { name: "Towing", basePrice: 1299 },
  { name: "Lockout assist", basePrice: 399 },
  { name: "Oil & fluids", basePrice: 799 },
  { name: "AC repair", basePrice: 1199 },
  { name: "Alternator replacement", basePrice: 1899 },
  { name: "Windshield chip repair", basePrice: 349 },
  { name: "Suspension check", basePrice: 999 },
  { name: "Electrical fault trace", basePrice: 1099 },
  { name: "Pre-purchase inspection", basePrice: 1299 },
] as const;

const VEHICLES: ReadonlyArray<readonly [string, string]> = [
  ["Maruti Swift 2021", "MH 12 AB 3456"],
  ["Hyundai Creta 2022", "KA 03 MN 7821"],
  ["Tata Nexon 2023", "DL 01 CA 4521"],
  ["Mahindra XUV700 2022", "MH 14 XY 9087"],
  ["Honda City 2020", "KA 05 HT 6612"],
  ["Toyota Innova Crysta 2021", "TN 07 BB 2234"],
  ["Kia Seltos 2022", "TS 09 KL 5567"],
  ["MG Hector 2021", "GJ 01 RS 8890"],
  ["Maruti Baleno 2019", "MH 02 CD 1123"],
  ["Hyundai i20 2022", "WB 06 PQ 7745"],
];

const FIRST_NAMES = [
  "Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Kavya", "Arjun", "Neha",
  "Rahul", "Pooja", "Aditya", "Isha", "Karan", "Divya", "Siddharth", "Meera",
  "Varun", "Shreya", "Nikhil", "Tanvi", "Harsh", "Anjali", "Yash", "Riya",
  "Dev", "Sneha", "Akash", "Nidhi", "Manish", "Swati", "Gaurav", "Pallavi",
  "Suresh", "Lakshmi", "Rajesh", "Deepa", "Amit", "Kiran", "Sanjay", "Rekha",
  "Vivek", "Asha", "Prakash", "Geeta", "Ramesh", "Sunita", "Mahesh", "Usha",
  "Anil", "Kavita", "Sunil", "Preeti", "Ravi", "Manju", "Ashok", "Sarita",
] as const;

const LAST_NAMES = [
  "Sharma", "Patel", "Reddy", "Iyer", "Singh", "Gupta", "Khan", "Nair",
  "Desai", "Mehta", "Joshi", "Rao", "Verma", "Malhotra", "Kapoor", "Chopra",
  "Bose", "Das", "Mukherjee", "Banerjee", "Pillai", "Menon", "Kulkarni", "Naik",
  "Shah", "Agarwal", "Saxena", "Tiwari", "Mishra", "Pandey", "Yadav", "Chauhan",
] as const;

const MECHANIC_NAMES = [
  "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Suresh Reddy", "Vikram Iyer",
  "Ramesh Singh", "Anil Gupta", "Sunil Khan", "Mahesh Nair", "Prakash Desai",
  "Sanjay Mehta", "Deepak Joshi", "Ravi Rao", "Kiran Verma", "Ashok Malhotra",
  "Manoj Kapoor", "Nitin Chopra", "Gopal Bose", "Harish Das", "Sandeep Pillai",
  "Arun Menon", "Vinod Kulkarni", "Rakesh Naik", "Mohit Shah",
] as const;

const MECHANIC_STATUSES: MechanicStatus[] = [
  MechanicStatus.on_job,
  MechanicStatus.available,
  MechanicStatus.on_job,
  MechanicStatus.available,
  MechanicStatus.offline,
  MechanicStatus.on_job,
  MechanicStatus.available,
  MechanicStatus.offline,
  MechanicStatus.on_job,
  MechanicStatus.available,
  MechanicStatus.on_job,
  MechanicStatus.available,
  MechanicStatus.offline,
  MechanicStatus.on_job,
  MechanicStatus.available,
  MechanicStatus.on_job,
  MechanicStatus.available,
  MechanicStatus.offline,
  MechanicStatus.available,
  MechanicStatus.on_job,
  MechanicStatus.available,
  MechanicStatus.offline,
  MechanicStatus.on_job,
  MechanicStatus.available,
];

const STATUS_POOL: BookingStatus[] = [
  BookingStatus.completed,
  BookingStatus.completed,
  BookingStatus.completed,
  BookingStatus.completed,
  BookingStatus.completed,
  BookingStatus.completed,
  BookingStatus.completed,
  BookingStatus.pending,
  BookingStatus.pending,
  BookingStatus.assigned,
  BookingStatus.assigned,
  BookingStatus.assigned,
  BookingStatus.on_the_way,
  BookingStatus.on_the_way,
  BookingStatus.cancelled,
  BookingStatus.cancelled,
];

function emailFromName(name: string): string {
  const local = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s.]/g, "")
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");

  return `${local || "customer"}@gmail.com`;
}

function indianPhone(index: number): string {
  const prefixes = ["98", "97", "96", "95", "94", "93", "91", "88", "87", "86"] as const;
  const prefix = prefixes[index % prefixes.length];
  const suffix = String(10_000_000 + index * 12_345).slice(-8);
  return `+91 ${prefix}${suffix}`;
}

function pickStatus(rand: () => number): BookingStatus {
  return STATUS_POOL[Math.floor(rand() * STATUS_POOL.length)] ?? BookingStatus.pending;
}

function amountForService(basePrice: number, rand: () => number): number {
  const variance = 0.75 + rand() * 0.55;
  return Math.round(basePrice * variance * 100) / 100;
}

function pickItem<T>(items: readonly T[], rand: () => number): T {
  const item = items[Math.floor(rand() * items.length)];
  if (item === undefined) {
    throw new Error("Cannot pick from an empty list");
  }
  return item;
}

function buildCustomerName(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
}

function needsMechanic(status: BookingStatus): boolean {
  return (
    status === BookingStatus.assigned ||
    status === BookingStatus.on_the_way ||
    status === BookingStatus.completed
  );
}

function buildActivityTimeline(
  status: BookingStatus,
  bookingNumber: string,
  mechanicName: string | null,
  serviceName: string,
  scheduledAt: Date,
): ActivityDraft[] {
  const activities: ActivityDraft[] = [];
  const base = scheduledAt.getTime();

  activities.push({
    fromStatus: null,
    toStatus: BookingStatus.pending,
    message: `New booking created — ${serviceName}`,
    actor: "Dispatch",
    createdAt: new Date(base),
  });

  if (status === BookingStatus.pending) {
    return activities;
  }

  activities.push({
    fromStatus: BookingStatus.pending,
    toStatus: BookingStatus.assigned,
    message: `${mechanicName ?? "A mechanic"} assigned to ${serviceName.toLowerCase()}`,
    actor: "Dispatch",
    createdAt: new Date(base + 4 * 60_000),
  });

  if (status === BookingStatus.assigned) {
    return activities;
  }

  if (status === BookingStatus.cancelled) {
    activities.push({
      fromStatus: BookingStatus.assigned,
      toStatus: BookingStatus.cancelled,
      message: `Customer cancelled — ${serviceName.toLowerCase()}`,
      actor: "Customer",
      createdAt: new Date(base + 12 * 60_000),
    });
    return activities;
  }

  activities.push({
    fromStatus: BookingStatus.assigned,
    toStatus: BookingStatus.on_the_way,
    message: `${mechanicName ?? "Mechanic"} is on the way`,
    actor: mechanicName ?? "Mechanic",
    createdAt: new Date(base + 9 * 60_000),
  });

  if (status === BookingStatus.on_the_way) {
    return activities;
  }

  activities.push({
    fromStatus: BookingStatus.on_the_way,
    toStatus: BookingStatus.completed,
    message: `${serviceName} completed for ${bookingNumber}`,
    actor: mechanicName ?? "Mechanic",
    createdAt: new Date(base + 26 * 60_000),
  });

  return activities;
}

async function createInBatches<T>(
  rows: T[],
  createBatch: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await createBatch(rows.slice(i, i + BATCH_SIZE));
  }
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.bookingActivity.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.mechanic.deleteMany();
  await prisma.customer.deleteMany();

  console.log("Creating service categories…");
  await prisma.serviceCategory.createMany({
    data: SERVICES.map((service) => ({
      name: service.name,
      basePrice: service.basePrice,
    })),
  });

  const serviceByName = new Map<string, ServiceRow>(
    (await prisma.serviceCategory.findMany()).map(
      (service: { id: string; name: string }) => [
        service.name,
        { id: service.id, name: service.name },
      ],
    ),
  );

  console.log("Creating customers…");
  const randCustomers = rng(42);
  const customerData = Array.from({ length: CUSTOMER_COUNT }, (_, index) => {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(randCustomers() * 120));

    return {
      name: buildCustomerName(index),
      phone: indianPhone(index),
      email: emailFromName(buildCustomerName(index)),
      zone: ZONES[index % ZONES.length],
      createdAt,
    };
  });

  await prisma.customer.createMany({ data: customerData });
  const customers: CustomerRow[] = (await prisma.customer.findMany()).map(
    (customer: { id: string; name: string; phone: string }) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
    }),
  );

  if (customers.length === 0) {
    throw new Error("No customers were created");
  }

  console.log("Creating mechanics…");
  await prisma.mechanic.createMany({
    data: MECHANIC_NAMES.map((name, index) => ({
      name,
      phone: indianPhone(100 + index),
      status: MECHANIC_STATUSES[index % MECHANIC_STATUSES.length],
      zone: ZONES[index % ZONES.length],
      jobsCompleted: 180 + ((index * 37) % 640),
      rating: Number((4.2 + (index % 8) * 0.1).toFixed(1)),
      since: 2019 + (index % 6),
      specialties: [
        SERVICES[index % SERVICES.length].name,
        SERVICES[(index + 3) % SERVICES.length].name,
      ],
    })),
  });

  const mechanics: MechanicRow[] = (await prisma.mechanic.findMany()).map(
    (mechanic: { id: string; name: string }) => ({
      id: mechanic.id,
      name: mechanic.name,
    }),
  );

  if (mechanics.length === 0) {
    throw new Error("No mechanics were created");
  }

  console.log("Creating bookings…");
  const randBookings = rng(770419);
  const bookingRows: BookingSeedRow[] = [];
  const seedEnd = seedEndDate();

  for (let index = 0; index < BOOKING_COUNT; index++) {
    const status = pickStatus(randBookings);
    const customer = pickItem(customers, randBookings);
    const [vehicle, plate] = pickItem(VEHICLES, randBookings);
    const service = pickItem(SERVICES, randBookings);
    const serviceRow = serviceByName.get(service.name);

    if (!serviceRow) {
      throw new Error(`Missing service category: ${service.name}`);
    }

    const mechanic = needsMechanic(status) ? pickItem(mechanics, randBookings) : null;

    const scheduledAt = new Date(seedEnd);
    scheduledAt.setDate(seedEnd.getDate() - Math.floor(index / 6));
    scheduledAt.setHours(7 + Math.floor(randBookings() * 13));
    scheduledAt.setMinutes(Math.floor(randBookings() * 4) * 15);

    bookingRows.push({
      bookingNumber: `IM-${(48_210 - index).toString()}`,
      customerId: customer.id,
      mechanicId: mechanic?.id ?? null,
      serviceId: serviceRow.id,
      vehicle,
      plate,
      status,
      amount: amountForService(service.basePrice, randBookings),
      scheduledAt,
      location: pickItem(ZONES, randBookings),
      createdAt: scheduledAt,
    });
  }

  await createInBatches(bookingRows, (batch) => prisma.booking.createMany({ data: batch }));

  const bookings: BookingWithRelations[] = await prisma.booking.findMany({
    include: { service: true, mechanic: true },
    orderBy: { scheduledAt: "desc" },
  });

  console.log("Creating booking activity timeline…");
  const activityRows = bookings.flatMap((booking) =>
    buildActivityTimeline(
      booking.status,
      booking.bookingNumber,
      booking.mechanic?.name ?? null,
      booking.service.name,
      booking.scheduledAt,
    ).map((entry) => ({
      ...entry,
      bookingId: booking.id,
    })),
  );

  await createInBatches(activityRows, (batch) =>
    prisma.bookingActivity.createMany({ data: batch }),
  );

  console.log("Updating mechanic job counts…");
  const completedByMechanic = await prisma.booking.groupBy({
    by: ["mechanicId"],
    where: { status: BookingStatus.completed, mechanicId: { not: null } },
    _count: { _all: true },
  });

  await Promise.all(
    completedByMechanic
      .filter(
        (row: { mechanicId: string | null; _count: { _all: number } }): row is {
          mechanicId: string;
          _count: { _all: number };
        } => row.mechanicId !== null,
      )
      .map((row: { mechanicId: string; _count: { _all: number } }) =>
        prisma.mechanic.update({
          where: { id: row.mechanicId },
          data: { jobsCompleted: row._count._all },
        }),
      ),
  );

  const counts = {
    customers: await prisma.customer.count(),
    mechanics: await prisma.mechanic.count(),
    services: await prisma.serviceCategory.count(),
    bookings: await prisma.booking.count(),
    activities: await prisma.bookingActivity.count(),
  };

  console.log("Seed complete:");
  console.log(counts);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
