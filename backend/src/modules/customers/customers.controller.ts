import type { Request, Response } from "express";
import { paramAsString, queryAsString } from "../../lib/params.js";
import { customersService } from "./customers.service.js";

export const customersController = {
  async list(req: Request, res: Response) {
    const result = await customersService.list({
      q: queryAsString(req, "q"),
      sort: queryAsString(req, "sort"),
      dir: queryAsString(req, "dir"),
      page: queryAsString(req, "page"),
      limit: queryAsString(req, "limit"),
    });
    res.json(result);
  },

  async getById(req: Request, res: Response) {
    const customer = await customersService.getById(paramAsString(req.params.id));
    res.json(customer);
  },

  async create(req: Request, res: Response) {
    const customer = await customersService.create(req.body ?? {});
    res.status(201).json(customer);
  },
};
