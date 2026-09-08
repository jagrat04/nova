import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { asyncHandler } from "../lib/async.js";
import { ApiError } from "../lib/errors.js";
import { signToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { publicUserSelect } from "../lib/serializers.js";
import { avatarColorFor } from "../lib/colors.js";
import { logActivity } from "../lib/activity.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  title: z.string().trim().max(60).optional(),
  inviteToken: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});

/** POST /api/auth/register — create an account and return a session token. */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, title, inviteToken } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw ApiError.conflict("An account with that email already exists");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        title,
        passwordHash: await bcrypt.hash(password, 12),
        avatarColor: avatarColorFor(email),
      },
      select: publicUserSelect,
    });

    await acceptPendingInvites(user.id, email, inviteToken);

    res.status(201).json({
      user,
      token: signToken({ sub: user.id, email: user.email }),
    });
  }),
);

/** POST /api/auth/login — exchange credentials for a session token. */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    // Same message for both branches so the endpoint does not reveal which emails exist.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw ApiError.unauthorized("Incorrect email or password");
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        avatarColor: user.avatarColor,
      },
      token: signToken({ sub: user.id, email: user.email }),
    });
  }),
);

/** GET /api/auth/me — the signed-in user, used to restore a session on page load. */
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);

/** PATCH /api/auth/me — update the signed-in user's profile. */
router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2).max(60).optional(),
        title: z.string().trim().max(60).nullable().optional(),
        avatarColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #6366f1")
          .optional(),
      })
      .parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: publicUserSelect,
    });
    res.json({ user });
  }),
);

/** POST /api/auth/change-password */
router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "Password must be at least 8 characters").max(72),
      })
      .parse(req.body);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw ApiError.badRequest("Current password is incorrect");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    res.json({ ok: true });
  }),
);

/**
 * Turns any outstanding invitations for this email into project memberships.
 * `token` lets someone accept an invite sent to a different address.
 */
async function acceptPendingInvites(userId: string, email: string, token?: string) {
  const invites = await prisma.invitation.findMany({
    where: {
      acceptedAt: null,
      expiresAt: { gt: new Date() },
      OR: [{ email }, ...(token ? [{ token }] : [])],
    },
  });

  for (const invite of invites) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: invite.projectId, userId } },
      create: { projectId: invite.projectId, userId, role: invite.role },
      update: {},
    });
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    await logActivity({
      projectId: invite.projectId,
      actorId: userId,
      action: "member.joined",
      summary: `joined the project as ${invite.role === Role.VIEWER ? "a viewer" : "a member"}`,
    });
  }
}

export default router;
