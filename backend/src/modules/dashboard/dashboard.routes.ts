import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { dashboardController } from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", asyncHandler(dashboardController.getOverview));
