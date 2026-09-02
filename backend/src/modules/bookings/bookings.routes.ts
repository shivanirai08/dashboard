import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { bookingsController } from "./bookings.controller.js";

export const bookingsRouter = Router();

bookingsRouter.get("/", asyncHandler(bookingsController.list));
bookingsRouter.post("/", asyncHandler(bookingsController.create));
bookingsRouter.get("/meta/counts", asyncHandler(bookingsController.getStatusCounts));
bookingsRouter.get("/meta/filters", asyncHandler(bookingsController.getFilters));
bookingsRouter.get("/:id", asyncHandler(bookingsController.getById));
bookingsRouter.patch("/:id/reassign", asyncHandler(bookingsController.reassign));
