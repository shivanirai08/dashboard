import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { customersController } from "./customers.controller.js";

export const customersRouter = Router();

customersRouter.get("/", asyncHandler(customersController.list));
customersRouter.get("/:id", asyncHandler(customersController.getById));
