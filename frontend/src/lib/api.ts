import type {
  Activity,
  Booking,
  Customer,
  Kpi,
  Mechanic,
  SeriesPoint,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type QueryParams = Record<string, string | number | undefined>;

async function apiFetch<T>(path: string, params?: QueryParams): Promise<T> {
  const url = new URL(path, API_URL);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DashboardOverview = {
  kpis: Kpi[];
  series30: SeriesPoint[];
  recentBookings: Booking[];
  activity: Activity[];
};

export type AnalyticsData = {
  range: "7d" | "30d" | "90d";
  totals: {
    bookings: number;
    revenue: number;
    completionRate: number;
  };
  series: SeriesPoint[];
  statusBreakdown: { key: string; name: string; value: number }[];
  serviceBreakdown: { name: string; value: number }[];
  revenueFormatted: string;
};

export type BookingListResponse = {
  data: Booking[];
  meta: PaginationMeta;
};

export type BookingFilters = {
  services: string[];
  mechanics: string[];
};

export type StatusCounts = Record<string, number>;

export type MechanicListResponse = {
  data: Mechanic[];
  meta: { total: number };
};

export type MechanicStatusCounts = {
  all: number;
  available: number;
  on_job: number;
  offline: number;
};

export type CustomerListResponse = {
  data: Customer[];
  meta: PaginationMeta;
  summary: {
    totalCustomers: number;
    totalBookings: number;
    avgLifetimeValue: number;
  };
};

export const api = {
  getDashboard: () => apiFetch<DashboardOverview>("/api/dashboard"),

  getAnalytics: (range: "7d" | "30d" | "90d") =>
    apiFetch<AnalyticsData>("/api/analytics", { range }),

  getBookings: (params: {
    q?: string;
    status?: string;
    service?: string;
    mechanic?: string;
    sort?: string;
    dir?: string;
    page?: number;
    limit?: number;
  }) =>
    apiFetch<BookingListResponse>("/api/bookings", {
      q: params.q,
      status: params.status === "all" ? undefined : params.status,
      service: params.service === "all" ? undefined : params.service,
      mechanic: params.mechanic === "all" ? undefined : params.mechanic,
      sort: params.sort,
      dir: params.dir,
      page: params.page,
      limit: params.limit,
    }),

  getBookingStatusCounts: () => apiFetch<StatusCounts>("/api/bookings/meta/counts"),

  getBookingFilters: () => apiFetch<BookingFilters>("/api/bookings/meta/filters"),

  getMechanics: (params?: { q?: string; status?: string }) =>
    apiFetch<MechanicListResponse>("/api/mechanics", {
      q: params?.q,
      status: params?.status === "all" ? undefined : params?.status,
    }),

  getMechanicStatusCounts: () =>
    apiFetch<MechanicStatusCounts>("/api/mechanics/meta/counts"),

  getCustomers: (params: {
    q?: string;
    sort?: string;
    dir?: string;
    page?: number;
    limit?: number;
  }) =>
    apiFetch<CustomerListResponse>("/api/customers", {
      q: params.q,
      sort: params.sort,
      dir: params.dir,
      page: params.page,
      limit: params.limit,
    }),
};
