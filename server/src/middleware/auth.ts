import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors.js";
import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { publicUserSelect } from "../lib/serializers.js";
import type { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  title: string | null;
  avatarColor: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      membershipRole?: Role;
    }
  }
}

/** Rejects the request unless it carries a valid `Authorization: Bearer <jwt>` header. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized();

    const payload = verifyToken(header.slice(7));
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: publicUserSelect,
    });
    if (!user) throw ApiError.unauthorized("Account no longer exists");

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}
