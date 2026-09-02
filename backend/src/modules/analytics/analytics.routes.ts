import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { analyticsController } from "./analytics.controller.js";

export const analyticsRouter = Router();

analyticsRouter.get("/", asyncHandler(analyticsController.getAnalytics));
