import type { Request, Response } from "express";
import { dashboardService } from "./dashboard.service.js";

export const dashboardController = {
  async getOverview(_req: Request, res: Response) {
    const data = await dashboardService.getOverview();
    res.json(data);
  },
};
