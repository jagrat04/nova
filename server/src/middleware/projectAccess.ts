import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { ApiError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

/** Role hierarchy — a higher rank implies every permission of the ranks below it. */
const RANK: Record<Role, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function hasAtLeast(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

/**
 * Loads the caller's membership for `:projectId` and stores the role on the request.
 * Responds 404 (not 403) for projects the caller cannot see, so membership is not leaked.
 */
export function requireProjectRole(minimum: Role = Role.VIEWER) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw ApiError.unauthorized();

      const projectId = req.params.projectId ?? req.params.id;
      if (!projectId) throw ApiError.badRequest("Project id missing from route");

      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user.id } },
        select: { role: true },
      });
      if (!membership) throw ApiError.notFound("Project not found");

      if (!hasAtLeast(membership.role, minimum)) {
        throw ApiError.forbidden(
          `This action requires the ${minimum.toLowerCase()} role or higher`,
        );
      }

      req.membershipRole = membership.role;
      next();
    } catch (error) {
      next(error);
    }
  };
}
