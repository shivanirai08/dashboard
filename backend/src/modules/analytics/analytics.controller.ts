import type { Request, Response } from "express";
import { queryAsString } from "../../lib/params.js";
import { analyticsService } from "./analytics.service.js";

export const analyticsController = {
  async getAnalytics(req: Request, res: Response) {
    const range = queryAsString(req, "range") ?? "30d";
    const data = await analyticsService.getAnalytics(range);
    res.json(data);
  },
};
