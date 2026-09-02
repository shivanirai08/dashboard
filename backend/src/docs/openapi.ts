const bookingStatus = ["pending", "assigned", "on_the_way", "completed", "cancelled"] as const;
const mechanicStatus = ["available", "on_job", "offline"] as const;

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Instant Mechanic Live Ops API",
    version: "1.0.0",
    description:
      "REST API for the Instant Mechanic Live Vehicle Service Operations Dashboard. " +
      "Powers overview KPIs, analytics, bookings, mechanics, and customers pages.",
    contact: {
      name: "Instant Mechanic",
    },
  },
  servers: [
    { url: "http://localhost:4000", description: "Local development" },
  ],
  tags: [
    { name: "Health", description: "Service health check" },
    { name: "Dashboard", description: "Overview page — KPIs, charts, recent activity" },
    { name: "Analytics", description: "Analytics page — trends and breakdowns" },
    { name: "Bookings", description: "Bookings list, filters, and detail" },
    { name: "Mechanics", description: "Mechanics roster and status" },
    { name: "Customers", description: "Customer directory and profiles" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns service status. Does not require database.",
        responses: {
          "200": {
            description: "Service is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    service: { type: "string", example: "instant-mechanic-api" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Dashboard overview",
        description: "KPI cards, 30-day booking series, recent bookings, and live activity feed.",
        responses: {
          "200": {
            description: "Overview payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardOverview" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/analytics": {
      get: {
        tags: ["Analytics"],
        summary: "Analytics data",
        description: "Bookings/revenue trends, status breakdown, and top services for a date range.",
        parameters: [
          {
            name: "range",
            in: "query",
            schema: { type: "string", enum: ["7d", "30d", "90d"], default: "30d" },
            description: "Lookback window",
          },
        ],
        responses: {
          "200": {
            description: "Analytics payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalyticsResponse" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "List bookings",
        description: "Paginated bookings with search, filters, and sorting.",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search booking #, customer, vehicle, plate, service, mechanic, location" },
          { name: "status", in: "query", schema: { type: "string", enum: ["all", ...bookingStatus] }, description: "Filter by status (`all` = no filter)" },
          { name: "service", in: "query", schema: { type: "string" }, description: "Service name filter (`all` = no filter)" },
          { name: "mechanic", in: "query", schema: { type: "string" }, description: "Mechanic name filter (`all` = no filter)" },
          { name: "sort", in: "query", schema: { type: "string", enum: ["id", "customer", "service", "mechanic", "amount", "date"], default: "date" } },
          { name: "dir", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          "200": {
            description: "Paginated bookings",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BookingListResponse" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/bookings/meta/counts": {
      get: {
        tags: ["Bookings"],
        summary: "Booking status counts",
        description: "Counts per status tab including `all`.",
        responses: {
          "200": {
            description: "Status counts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StatusCounts" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/bookings/meta/filters": {
      get: {
        tags: ["Bookings"],
        summary: "Booking filter options",
        description: "Distinct service and mechanic names for filter dropdowns.",
        responses: {
          "200": {
            description: "Filter options",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    services: { type: "array", items: { type: "string" }, example: ["Battery Jump Start", "Oil Change"] },
                    mechanics: { type: "array", items: { type: "string" }, example: ["Rahul Sharma", "Priya Patel"] },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/bookings/{id}": {
      get: {
        tags: ["Bookings"],
        summary: "Get booking by ID",
        description: "Accepts UUID or booking number (e.g. `IM-48210`).",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "IM-48210",
          },
        ],
        responses: {
          "200": {
            description: "Booking detail with timeline",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BookingDetail" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/mechanics": {
      get: {
        tags: ["Mechanics"],
        summary: "List mechanics",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search name, zone, or phone" },
          { name: "status", in: "query", schema: { type: "string", enum: ["all", ...mechanicStatus] } },
        ],
        responses: {
          "200": {
            description: "Mechanics list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MechanicListResponse" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/mechanics/meta/counts": {
      get: {
        tags: ["Mechanics"],
        summary: "Mechanic status counts",
        responses: {
          "200": {
            description: "Status counts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    all: { type: "integer" },
                    available: { type: "integer" },
                    on_job: { type: "integer" },
                    offline: { type: "integer" },
                  },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/mechanics/{id}": {
      get: {
        tags: ["Mechanics"],
        summary: "Get mechanic by ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, example: "clx123abc" },
        ],
        responses: {
          "200": {
            description: "Mechanic detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Mechanic" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/customers": {
      get: {
        tags: ["Customers"],
        summary: "List customers",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search name, phone, email, zone" },
          { name: "sort", in: "query", schema: { type: "string", enum: ["name", "bookingsCount", "totalSpent", "joinedAt"], default: "name" } },
          { name: "dir", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          "200": {
            description: "Paginated customers with summary",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CustomerListResponse" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/customers/{id}": {
      get: {
        tags: ["Customers"],
        summary: "Get customer by ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Customer detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Customer" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Booking not found" },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          total: { type: "integer", example: 520 },
          page: { type: "integer", example: 0 },
          pageSize: { type: "integer", example: 10 },
          totalPages: { type: "integer", example: 52 },
        },
      },
      Kpi: {
        type: "object",
        properties: {
          key: { type: "string", example: "total" },
          label: { type: "string", example: "Total bookings" },
          value: { type: "string", example: "520" },
          delta: { type: "number", example: 8.4 },
          icon: {
            type: "string",
            enum: ["calendar", "clock", "check", "hourglass", "x", "revenue", "wrench", "users"],
          },
          tone: { type: "string", enum: ["accent", "neutral"] },
        },
      },
      SeriesPoint: {
        type: "object",
        properties: {
          label: { type: "string", example: "2 Sep" },
          full: { type: "string", example: "2 Sep 2026" },
          bookings: { type: "integer", example: 18 },
          completed: { type: "integer", example: 14 },
          revenue: { type: "number", example: 28500 },
        },
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string", description: "Booking number", example: "IM-48210" },
          customer: { type: "string", example: "Aarav Mehta" },
          phone: { type: "string", example: "+91 98765 43210" },
          vehicle: { type: "string", example: "Maruti Swift" },
          plate: { type: "string", example: "MH 12 AB 1234" },
          service: { type: "string", example: "Battery Jump Start" },
          mechanic: { type: "string", nullable: true, example: "Rahul Sharma" },
          status: { type: "string", enum: [...bookingStatus] },
          amount: { type: "number", example: 1499 },
          date: { type: "string", example: "2 Sep 2026" },
          time: { type: "string", example: "14:30" },
          location: { type: "string", example: "Andheri West, Mumbai" },
        },
      },
      BookingDetail: {
        allOf: [
          { $ref: "#/components/schemas/Booking" },
          {
            type: "object",
            properties: {
              email: { type: "string", nullable: true },
              zone: { type: "string", nullable: true },
              scheduledAt: { type: "string", format: "date-time" },
              timeline: {
                type: "array",
                items: { $ref: "#/components/schemas/BookingActivity" },
              },
            },
          },
        ],
      },
      BookingActivity: {
        type: "object",
        properties: {
          id: { type: "string" },
          fromStatus: { type: "string", nullable: true },
          toStatus: { type: "string" },
          message: { type: "string" },
          actor: { type: "string" },
          at: { type: "string", format: "date-time" },
        },
      },
      Activity: {
        type: "object",
        properties: {
          id: { type: "string" },
          bookingId: { type: "string", example: "IM-48210" },
          text: { type: "string" },
          actor: { type: "string" },
          ago: { type: "string", example: "5 min" },
          status: { type: "string", enum: [...bookingStatus] },
          live: { type: "boolean" },
        },
      },
      DashboardOverview: {
        type: "object",
        properties: {
          kpis: { type: "array", items: { $ref: "#/components/schemas/Kpi" } },
          series30: { type: "array", items: { $ref: "#/components/schemas/SeriesPoint" } },
          recentBookings: { type: "array", items: { $ref: "#/components/schemas/Booking" } },
          activity: { type: "array", items: { $ref: "#/components/schemas/Activity" } },
        },
      },
      AnalyticsResponse: {
        type: "object",
        properties: {
          range: { type: "string", enum: ["7d", "30d", "90d"] },
          totals: {
            type: "object",
            properties: {
              bookings: { type: "integer" },
              revenue: { type: "number" },
              completionRate: { type: "integer", description: "Percentage 0–100" },
            },
          },
          series: { type: "array", items: { $ref: "#/components/schemas/SeriesPoint" } },
          statusBreakdown: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                name: { type: "string" },
                value: { type: "integer" },
              },
            },
          },
          serviceBreakdown: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "integer" },
              },
            },
          },
          revenueFormatted: { type: "string", example: "₹4,25,000" },
        },
      },
      BookingListResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Booking" } },
          meta: { $ref: "#/components/schemas/PaginationMeta" },
        },
      },
      StatusCounts: {
        type: "object",
        additionalProperties: { type: "integer" },
        example: { all: 520, pending: 42, assigned: 38, on_the_way: 25, completed: 380, cancelled: 35 },
      },
      MechanicBookingRef: {
        type: "object",
        properties: {
          id: { type: "string", example: "IM-48210" },
          service: { type: "string" },
          customer: { type: "string" },
        },
      },
      Mechanic: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "Rahul Sharma" },
          status: { type: "string", enum: [...mechanicStatus] },
          jobsCompleted: { type: "integer", example: 128 },
          rating: { type: "number", example: 4.7 },
          zone: { type: "string", example: "Mumbai Central" },
          phone: { type: "string", example: "+91 98765 43210" },
          since: { type: "string", example: "2022" },
          specialties: { type: "array", items: { type: "string" } },
          currentBooking: { nullable: true, allOf: [{ $ref: "#/components/schemas/MechanicBookingRef" }] },
          lastBooking: { $ref: "#/components/schemas/MechanicBookingRef" },
        },
      },
      MechanicListResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Mechanic" } },
          meta: {
            type: "object",
            properties: { total: { type: "integer" } },
          },
        },
      },
      Customer: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          zone: { type: "string" },
          bookingsCount: { type: "integer" },
          totalSpent: { type: "number" },
          totalSpentFormatted: { type: "string", example: "₹45,000" },
          lastBooking: {
            type: "object",
            properties: {
              id: { type: "string" },
              service: { type: "string" },
              date: { type: "string" },
            },
          },
          vehicles: { type: "array", items: { type: "string" } },
          joinedAt: { type: "string", example: "15 Jan 2024" },
        },
      },
      CustomerListResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Customer" } },
          meta: { $ref: "#/components/schemas/PaginationMeta" },
          summary: {
            type: "object",
            properties: {
              totalCustomers: { type: "integer" },
              totalBookings: { type: "integer" },
              avgLifetimeValue: { type: "integer" },
            },
          },
        },
      },
    },
    responses: {
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      InternalError: {
        description: "Unexpected server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
};
