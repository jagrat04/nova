import { Router } from "express";
import { z } from "zod";
import { ProjectStatus, Role, TaskStatus } from "@prisma/client";
import { asyncHandler } from "../lib/async.js";
import { prisma } from "../lib/prisma.js";
import { publicUserSelect } from "../lib/serializers.js";
import { logActivity } from "../lib/activity.js";
import { requireProjectRole } from "../middleware/projectAccess.js";

const router = Router();

const projectBody = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,5}$/, "Key must be 2 to 6 letters or digits, starting with a letter")
    .optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

const memberSummary = {
  select: { role: true, joinedAt: true, user: { select: publicUserSelect } },
} as const;

const projectInclude = {
  owner: { select: publicUserSelect },
  members: memberSummary,
  _count: { select: { tasks: true, members: true } },
} as const;

/** Derives a project key such as "NOVA" from the project name. */
function keyFromName(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const candidate =
    words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] ?? "PRJ").slice(0, 4);
  const key = candidate.replace(/^[^A-Z]+/, "").slice(0, 6);
  return key.length >= 2 ? key : "PRJ";
}

function emptyProgress() {
  return {
    total: 0,
    completed: 0,
    percent: 0,
    byStatus: {
      [TaskStatus.BACKLOG]: 0,
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.DONE]: 0,
    } as Record<TaskStatus, number>,
  };
}

/** Counts tasks by status and turns them into progress numbers for each project card. */
async function progressFor(projectIds: string[]) {
  const byProject = new Map<string, ReturnType<typeof emptyProgress>>();
  for (const id of projectIds) byProject.set(id, emptyProgress());
  if (projectIds.length === 0) return byProject;

  const grouped = await prisma.task.groupBy({
    by: ["projectId", "status"],
    where: { projectId: { in: projectIds } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    const entry = byProject.get(row.projectId);
    if (!entry) continue;
    entry.byStatus[row.status] = row._count._all;
    entry.total += row._count._all;
  }
  for (const entry of byProject.values()) {
    entry.completed = entry.byStatus[TaskStatus.DONE];
    entry.percent = entry.total === 0 ? 0 : Math.round((entry.completed / entry.total) * 100);
  }
  return byProject;
}

/** GET /api/projects - every project the caller is a member of. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, q } = z
      .object({ status: z.nativeEnum(ProjectStatus).optional(), q: z.string().trim().optional() })
      .parse(req.query);

    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: req.user!.id } },
        ...(status ? { status } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      },
      include: projectInclude,
      orderBy: { updatedAt: "desc" },
    });

    const progress = await progressFor(projects.map((p) => p.id));
    res.json({
      projects: projects.map((project) => ({
        ...project,
        role: project.members.find((m) => m.user.id === req.user!.id)?.role ?? Role.VIEWER,
        progress: progress.get(project.id) ?? emptyProgress(),
      })),
    });
  }),
);

/** POST /api/projects - create a project; the creator becomes its owner. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = projectBody.parse(req.body);
    const userId = req.user!.id;

    const project = await prisma.project.create({
      data: {
        ...body,
        key: body.key ?? keyFromName(body.name),
        ownerId: userId,
        members: { create: { userId, role: Role.OWNER } },
      },
      include: projectInclude,
    });

    await logActivity({
      projectId: project.id,
      actorId: userId,
      action: "project.created",
      summary: `created the project ${project.name}`,
    });

    res.status(201).json({ project: { ...project, role: Role.OWNER, progress: emptyProgress() } });
  }),
);

/** GET /api/projects/:projectId */
router.get(
  "/:projectId",
  requireProjectRole(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: req.params.projectId },
      include: projectInclude,
    });

    const progress = await progressFor([project.id]);
    res.json({
      project: {
        ...project,
        role: req.membershipRole,
        progress: progress.get(project.id) ?? emptyProgress(),
      },
    });
  }),
);

/** PATCH /api/projects/:projectId - admins and owners only. */
router.patch(
  "/:projectId",
  requireProjectRole(Role.ADMIN),
  asyncHandler(async (req, res) => {
    const body = projectBody.partial().parse(req.body);

    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: body,
      include: projectInclude,
    });

    await logActivity({
      projectId: project.id,
      actorId: req.user!.id,
      action: "project.updated",
      summary: "updated the project settings",
      meta: { fields: Object.keys(body) },
    });

    const progress = await progressFor([project.id]);
    res.json({
      project: {
        ...project,
        role: req.membershipRole,
        progress: progress.get(project.id) ?? emptyProgress(),
      },
    });
  }),
);

/** DELETE /api/projects/:projectId - owner only; cascades to tasks, members and activity. */
router.delete(
  "/:projectId",
  requireProjectRole(Role.OWNER),
  asyncHandler(async (req, res) => {
    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.status(204).send();
  }),
);

/** GET /api/projects/:projectId/activity - recent project events. */
router.get(
  "/:projectId/activity",
  requireProjectRole(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const { limit } = z
      .object({ limit: z.coerce.number().int().min(1).max(100).default(30) })
      .parse(req.query);

    const activities = await prisma.activity.findMany({
      where: { projectId: req.params.projectId },
      include: { actor: { select: publicUserSelect } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.json({ activities });
  }),
);

/** GET /api/projects/:projectId/stats - board counts, workload and overdue totals. */
router.get(
  "/:projectId/stats",
  requireProjectRole(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;

    const [byStatus, byPriority, byAssignee, overdue] = await Promise.all([
      prisma.task.groupBy({ by: ["status"], where: { projectId }, _count: { _all: true } }),
      prisma.task.groupBy({ by: ["priority"], where: { projectId }, _count: { _all: true } }),
      prisma.task.groupBy({
        by: ["assigneeId"],
        where: { projectId, status: { not: TaskStatus.DONE } },
        _count: { _all: true },
      }),
      prisma.task.count({
        where: { projectId, status: { not: TaskStatus.DONE }, dueDate: { lt: new Date() } },
      }),
    ]);

    const assigneeIds = byAssignee.map((a) => a.assigneeId).filter((id): id is string => !!id);
    const users = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: publicUserSelect,
    });

    res.json({
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
      byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r._count._all])),
      workload: byAssignee.map((row) => ({
        user: users.find((u) => u.id === row.assigneeId) ?? null,
        openTasks: row._count._all,
      })),
      overdue,
    });
  }),
);

export default router;
