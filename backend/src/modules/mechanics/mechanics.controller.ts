import type { Request, Response } from "express";
import { paramAsString, queryAsString } from "../../lib/params.js";
import { mechanicsService } from "./mechanics.service.js";

export const mechanicsController = {
  async list(req: Request, res: Response) {
    const result = await mechanicsService.list({
      q: queryAsString(req, "q"),
      status: queryAsString(req, "status"),
    });
    res.json(result);
  },

  async getStatusCounts(_req: Request, res: Response) {
    const counts = await mechanicsService.getStatusCounts();
    res.json(counts);
  },

  async getById(req: Request, res: Response) {
    const mechanic = await mechanicsService.getById(paramAsString(req.params.id));
    res.json(mechanic);
  },
};
