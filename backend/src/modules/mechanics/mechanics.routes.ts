import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { mechanicsController } from "./mechanics.controller.js";

export const mechanicsRouter = Router();

mechanicsRouter.get("/", asyncHandler(mechanicsController.list));
mechanicsRouter.get("/meta/counts", asyncHandler(mechanicsController.getStatusCounts));
mechanicsRouter.get("/:id", asyncHandler(mechanicsController.getById));
