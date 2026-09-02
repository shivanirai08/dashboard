import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { bookingsController } from "./bookings.controller.js";

export const bookingsRouter = Router();

bookingsRouter.get("/", asyncHandler(bookingsController.list));
bookingsRouter.get("/meta/counts", asyncHandler(bookingsController.getStatusCounts));
bookingsRouter.get("/meta/filters", asyncHandler(bookingsController.getFilters));
bookingsRouter.get("/:id", asyncHandler(bookingsController.getById));
