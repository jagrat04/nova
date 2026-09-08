import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { asyncHandler } from "../lib/async.js";
import { ApiError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { publicUserSelect } from "../lib/serializers.js";
import { logActivity } from "../lib/activity.js";
import { hasAtLeast, requireProjectRole } from "../middleware/projectAccess.js";

// mergeParams so :projectId from the parent mount is visible here.
const router = Router({ mergeParams: true });

const INVITE_TTL_DAYS = 14;

/** GET /api/projects/:projectId/members - members plus any invitations still outstanding. */
router.get(
  "/",
  requireProjectRole(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;

    const [members, invitations] = await Promise.all([
      prisma.projectMember.findMany({
        where: { projectId },
        select: { role: true, joinedAt: true, user: { select: publicUserSelect } },
        orderBy: { joinedAt: "asc" },
      }),
      prisma.invitation.findMany({
        where: { projectId, acceptedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, role: true, token: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({ members, invitations });
  }),
);

/**
 * POST /api/projects/:projectId/members - add someone by email.
 * Registered users join immediately; everyone else gets an invitation redeemed at sign-up.
 */
router.post(
  "/",
  requireProjectRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { email, role } = z
      .object({
        email: z.string().trim().toLowerCase().email("Enter a valid email address"),
        role: z.nativeEnum(Role).default(Role.MEMBER),
      })
      .parse(req.body);

    if (role === Role.OWNER) {
      throw ApiError.badRequest("Transfer ownership from project settings instead");
    }

    const projectId = req.params.projectId;
    const user = await prisma.user.findUnique({ where: { email }, select: publicUserSelect });

    if (!user) {
      const invitation = await prisma.invitation.upsert({
        where: { projectId_email: { projectId, email } },
        create: {
          projectId,
          email,
          role,
          token: randomBytes(24).toString("hex"),
          invitedById: req.user!.id,
          expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
        },
        update: {
          role,
          acceptedAt: null,
          expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
        },
        select: { id: true, email: true, role: true, token: true, expiresAt: true },
      });

      await logActivity({
        projectId,
        actorId: req.user!.id,
        action: "member.invited",
        summary: `invited ${email} to the project`,
      });

      return res.status(201).json({ invitation });
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });
    if (existing) throw ApiError.conflict(`${user.name} is already a member of this project`);

    const member = await prisma.projectMember.create({
      data: { projectId, userId: user.id, role },
      select: { role: true, joinedAt: true, user: { select: publicUserSelect } },
    });

    await logActivity({
      projectId,
      actorId: req.user!.id,
      action: "member.added",
      summary: `added ${user.name} as ${role.toLowerCase()}`,
    });

    res.status(201).json({ member });
  }),
);

/** PATCH /api/projects/:projectId/members/:userId - change a member's role. */
router.patch(
  "/:userId",
  requireProjectRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const { role } = z.object({ role: z.nativeEnum(Role) }).parse(req.body);
    const { projectId, userId } = req.params;

    if (role === Role.OWNER) {
      throw ApiError.badRequest("Transfer ownership from project settings instead");
    }

    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true, user: { select: { name: true } } },
    });
    if (!target) throw ApiError.notFound("That person is not a member of this project");
    if (target.role === Role.OWNER) throw ApiError.forbidden("The owner's role cannot be changed");

    const member = await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      select: { role: true, joinedAt: true, user: { select: publicUserSelect } },
    });

    await logActivity({
      projectId,
      actorId: req.user!.id,
      action: "member.role_changed",
      summary: `changed ${target.user.name}'s role to ${role.toLowerCase()}`,
    });

    res.json({ member });
  }),
);

/**
 * DELETE /api/projects/:projectId/members/:userId
 * Admins can remove others; any member can remove themselves (leave the project).
 */
router.delete(
  "/:userId",
  requireProjectRole(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;
    const isSelf = userId === req.user!.id;

    if (!isSelf && !hasAtLeast(req.membershipRole!, Role.ADMIN)) {
      throw ApiError.forbidden("Only admins can remove other members");
    }

    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true, user: { select: { name: true } } },
    });
    if (!target) throw ApiError.notFound("That person is not a member of this project");
    if (target.role === Role.OWNER) {
      throw ApiError.forbidden("The project owner cannot be removed");
    }

    // Leave their tasks in the project but unassigned, so nothing is silently orphaned
    // to someone who can no longer see the board.
    await prisma.$transaction([
      prisma.task.updateMany({
        where: { projectId, assigneeId: userId },
        data: { assigneeId: null },
      }),
      prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } }),
    ]);

    await logActivity({
      projectId,
      actorId: req.user!.id,
      action: isSelf ? "member.left" : "member.removed",
      summary: isSelf ? "left the project" : `removed ${target.user.name} from the project`,
    });

    res.status(204).send();
  }),
);

/** DELETE /api/projects/:projectId/members/invitations/:invitationId - revoke a pending invite. */
router.delete(
  "/invitations/:invitationId",
  requireProjectRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const invitation = await prisma.invitation.findFirst({
      where: { id: req.params.invitationId, projectId: req.params.projectId },
    });
    if (!invitation) throw ApiError.notFound("Invitation not found");

    await prisma.invitation.delete({ where: { id: invitation.id } });
    res.status(204).send();
  }),
);

export default router;
