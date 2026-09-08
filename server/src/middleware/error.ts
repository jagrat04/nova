import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ApiError } from "../lib/errors.js";
import { isProd } from "../lib/env.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      error: "Validation failed",
      details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message, details: error.details });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "That record already exists" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Not found" });
    }
  }

  if (!isProd) console.error(error);
  const message = error instanceof Error ? error.message : "Unexpected server error";
  res.status(500).json({ error: isProd ? "Unexpected server error" : message });
}
