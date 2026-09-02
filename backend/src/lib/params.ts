import type { Request } from "express";

export function paramAsString(value: string | string[]): string {
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

export function queryAsString(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}
