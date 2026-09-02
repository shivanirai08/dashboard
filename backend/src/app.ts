import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { setupSwagger } from "./docs/swagger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { bookingsRouter } from "./modules/bookings/bookings.routes.js";
import { mechanicsRouter } from "./modules/mechanics/mechanics.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: env.nodeEnv === "development" ? false : undefined,
    }),
  );
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

  setupSwagger(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "instant-mechanic-api" });
  });

  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/mechanics", mechanicsRouter);
  app.use("/api/customers", customersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
