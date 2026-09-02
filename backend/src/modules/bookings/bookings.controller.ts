import type { Request, Response } from "express";
import { paramAsString, queryAsString } from "../../lib/params.js";
import { bookingsService } from "./bookings.service.js";

export const bookingsController = {
  async list(req: Request, res: Response) {
    const result = await bookingsService.list({
      q: queryAsString(req, "q"),
      status: queryAsString(req, "status"),
      service: queryAsString(req, "service"),
      mechanic: queryAsString(req, "mechanic"),
      sort: queryAsString(req, "sort"),
      dir: queryAsString(req, "dir"),
      page: queryAsString(req, "page"),
      limit: queryAsString(req, "limit"),
    });
    res.json(result);
  },

  async getStatusCounts(_req: Request, res: Response) {
    const counts = await bookingsService.getStatusCounts();
    res.json(counts);
  },

  async getFilters(_req: Request, res: Response) {
    const filters = await bookingsService.getFilters();
    res.json(filters);
  },

  async getById(req: Request, res: Response) {
    const booking = await bookingsService.getById(paramAsString(req.params.id));
    res.json(booking);
  },

  async create(req: Request, res: Response) {
    const booking = await bookingsService.create(req.body ?? {});
    res.status(201).json(booking);
  },

  async reassign(req: Request, res: Response) {
    const booking = await bookingsService.reassign(paramAsString(req.params.id), req.body ?? {});
    res.json(booking);
  },

  async updateStatus(req: Request, res: Response) {
    const booking = await bookingsService.updateStatus(
      paramAsString(req.params.id),
      req.body ?? {},
    );
    res.json(booking);
  },
};
