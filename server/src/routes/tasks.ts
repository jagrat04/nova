import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { Priority, Role, TaskStatus } from "@prisma/client";
import { asyncHandler } from "../lib/async.js";
import { ApiError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { publicUserSelect, taskInclude } from "../lib/serializers.js";
import { logActivity } from "../lib/activity.js";
import { hasAtLeast, requireProjectRole } from "../middleware/projectAccess.js";

const taskBody = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(160),
  description: z.string().trim().max(5000).nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  position: z.number().optional(),
});

const STATUS_LABEL: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};

/** Rejects an assignee who is not a member of the project the task belongs to. */
async function assertAssigneeIsMember(projectId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
    select: { id: true },
  });
  if (!membership) throw ApiError.badRequest("You can only assign tasks to project members");
}

/** Places a new task at the end of its board column. */
async function nextPosition(projectId: string, status: TaskStatus): Promise<number> {
  const last = await prisma.task.aggregate({
    where: { projectId, status },
    _max: { position: true },
  });
  return (last._max.position ?? 0) + 1000;
}

// ---------------------------------------------------------------------------
// Mounted at /api/projects/:projectId/tasks
// ---------------------------------------------------------------------------
export const projectTasksRouter = Router({ mergeParams: true });

/** GET /api/projects/:projectId/tasks - filterable task list for the board and list views. */
projectTasksRouter.get(
  "/",
  requireProjectRole(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const filters = z
      .object({
        status: z.nativeEnum(TaskStatus).optional(),
        priority: z.nativeEnum(Priority).optional(),
        assigneeId: z.string().optional(),
        q: z.string().trim().optional(),
        overdue: z.enum(["true", "false"]).optional(),
      })
      .parse(req.query);

    const tasks = await prisma.task.findMany({
      where: {
        projectId: req.params.projectId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.assigneeId
          ? { assigneeId: filters.assigneeId === "unassigned" ? null : filters.assigneeId }
          : {}),
        ...(filters.overdue === "true"
          ? { dueDate: { lt: new Date() }, status: { not: TaskStatus.DONE } }
          : {}),
        ...(filters.q
          ? {
              OR: [
                { title: { contains: filters.q, mode: "insensitive" as const } },
                { description: { contains: filters.q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: taskInclude,
      orderBy: [{ status: "asc" }, { position: "asc" }],
    });

    res.json({ tasks });
  }),
);

/** POST /api/projects/:projectId/tasks - create a task. Viewers cannot write. */
projectTasksRouter.post(
  "/",
  requireProjectRole(Role.MEMBER),
  asyncHandler(async (req, res) => {
    const body = taskBody.parse(req.body);
    const projectId = req.params.projectId;
    const status = body.status ?? TaskStatus.TODO;

    await assertAssigneeIsMember(projectId, body.assigneeId);

    // Per-project task numbers (NOVA-14). Serialised so two creates cannot collide.
    const task = await prisma.$transaction(async (tx) => {
      const last = await tx.task.aggregate({
        where: { projectId },
        _max: { number: true },
      });

      return tx.task.create({
        data: {
          ...body,
          status,
          projectId,
          number: (last._max.number ?? 0) + 1,
          position: body.position ?? (await nextPosition(projectId, status)),
          createdById: req.user!.id,
          completedAt: status === TaskStatus.DONE ? new Date() : null,
        },
        include: taskInclude,
      });
    });

    await logActivity({
      projectId,
      actorId: req.user!.id,
      action: "task.created",
      summary: `created ${task.project.key}-${task.number} "${task.title}"`,
      meta: { taskId: task.id },
    });

    res.status(201).json({ task });
  }),
);

// ---------------------------------------------------------------------------
// Mounted at /api/tasks
// ---------------------------------------------------------------------------
export const taskRouter = Router();

/**
 * GET /api/tasks - tasks across every project the caller belongs to.
 * `assignee=me` powers the "My tasks" view; `unassigned` finds unowned work.
 */
taskRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filters = z
      .object({
        assignee: z.string().optional(),
        status: z.nativeEnum(TaskStatus).optional(),
        priority: z.nativeEnum(Priority).optional(),
        projectId: z.string().optional(),
        q: z.string().trim().optional(),
        open: z.enum(["true", "false"]).optional(),
      })
      .parse(req.query);

    const userId = req.user!.id;
    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const assigneeFilter =
      filters.assignee === "me"
        ? { assigneeId: userId }
        : filters.assignee === "unassigned"
          ? { assigneeId: null }
          : filters.assignee
            ? { assigneeId: filters.assignee }
            : {};

    const tasks = await prisma.task.findMany({
      where: {
        projectId: filters.projectId
          ? filters.projectId
          : { in: memberships.map((m) => m.projectId) },
        ...assigneeFilter,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.open === "true" ? { status: { not: TaskStatus.DONE } } : {}),
        ...(filters.q ? { title: { contains: filters.q, mode: "insensitive" as const } } : {}),
      },
      include: taskInclude,
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
      take: 200,
    });

    // A project filter can name a project the caller is not in - drop those rows.
    const allowed = new Set(memberships.map((m) => m.projectId));
    res.json({ tasks: tasks.filter((task) => allowed.has(task.projectId)) });
  }),
);

/** Loads :taskId and checks the caller's role on the project that owns it. */
function loadTask(minimum: Role) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        select: { id: true, projectId: true },
      });
      if (!task) throw ApiError.notFound("Task not found");

      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: req.user!.id } },
        select: { role: true },
      });
      if (!membership) throw ApiError.notFound("Task not found");
      if (!hasAtLeast(membership.role, minimum)) {
        throw ApiError.forbidden("You do not have permission to change this task");
      }

      req.membershipRole = membership.role;
      req.params.projectId = task.projectId;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** GET /api/tasks/:taskId - full task detail including comments. */
taskRouter.get(
  "/:taskId",
  loadTask(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUniqueOrThrow({
      where: { id: req.params.taskId },
      include: {
        ...taskInclude,
        comments: {
          include: { author: { select: publicUserSelect } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    res.json({ task });
  }),
);

/** PATCH /api/tasks/:taskId - edit fields, or move the card on the board. */
taskRouter.patch(
  "/:taskId",
  loadTask(Role.MEMBER),
  asyncHandler(async (req, res) => {
    const body = taskBody.partial().parse(req.body);
    const before = await prisma.task.findUniqueOrThrow({
      where: { id: req.params.taskId },
      include: taskInclude,
    });

    if (body.assigneeId !== undefined) {
      await assertAssigneeIsMember(before.projectId, body.assigneeId);
    }

    const movingToDone = body.status === TaskStatus.DONE && before.status !== TaskStatus.DONE;
    const movingOffDone =
      body.status !== undefined && body.status !== TaskStatus.DONE && before.status === TaskStatus.DONE;

    const task = await prisma.task.update({
      where: { id: before.id },
      data: {
        ...body,
        // Position defaults to the end of the destination column when the client does not send one.
        ...(body.status && body.status !== before.status && body.position === undefined
          ? { position: await nextPosition(before.projectId, body.status) }
          : {}),
        ...(movingToDone ? { completedAt: new Date() } : {}),
        ...(movingOffDone ? { completedAt: null } : {}),
      },
      include: taskInclude,
    });

    const code = `${task.project.key}-${task.number}`;
    if (body.status && body.status !== before.status) {
      await logActivity({
        projectId: task.projectId,
        actorId: req.user!.id,
        action: "task.status_changed",
        summary: `moved ${code} to ${STATUS_LABEL[task.status]}`,
        meta: { taskId: task.id, from: before.status, to: task.status },
      });
    } else if (body.assigneeId !== undefined && body.assigneeId !== before.assigneeId) {
      await logActivity({
        projectId: task.projectId,
        actorId: req.user!.id,
        action: "task.assigned",
        summary: task.assignee
          ? `assigned ${code} to ${task.assignee.name}`
          : `unassigned ${code}`,
        meta: { taskId: task.id },
      });
    } else if (Object.keys(body).some((k) => k !== "position")) {
      await logActivity({
        projectId: task.projectId,
        actorId: req.user!.id,
        action: "task.updated",
        summary: `updated ${code}`,
        meta: { taskId: task.id, fields: Object.keys(body) },
      });
    }

    res.json({ task });
  }),
);

/** DELETE /api/tasks/:taskId */
taskRouter.delete(
  "/:taskId",
  loadTask(Role.MEMBER),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.delete({
      where: { id: req.params.taskId },
      include: { project: { select: { key: true } } },
    });

    await logActivity({
      projectId: task.projectId,
      actorId: req.user!.id,
      action: "task.deleted",
      summary: `deleted ${task.project.key}-${task.number} "${task.title}"`,
    });

    res.status(204).send();
  }),
);

/** GET /api/tasks/:taskId/comments */
taskRouter.get(
  "/:taskId/comments",
  loadTask(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.taskId },
      include: { author: { select: publicUserSelect } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ comments });
  }),
);

/** POST /api/tasks/:taskId/comments */
taskRouter.post(
  "/:taskId/comments",
  loadTask(Role.MEMBER),
  asyncHandler(async (req, res) => {
    const { body } = z
      .object({ body: z.string().trim().min(1, "Write something first").max(2000) })
      .parse(req.body);

    const comment = await prisma.comment.create({
      data: { body, taskId: req.params.taskId, authorId: req.user!.id },
      include: { author: { select: publicUserSelect }, task: { select: { number: true, project: { select: { key: true } } } } },
    });

    await logActivity({
      projectId: req.params.projectId,
      actorId: req.user!.id,
      action: "comment.created",
      summary: `commented on ${comment.task.project.key}-${comment.task.number}`,
      meta: { taskId: req.params.taskId },
    });

    res.status(201).json({ comment: { ...comment, task: undefined } });
  }),
);

/** DELETE /api/tasks/:taskId/comments/:commentId - author or project admin. */
taskRouter.delete(
  "/:taskId/comments/:commentId",
  loadTask(Role.VIEWER),
  asyncHandler(async (req, res) => {
    const comment = await prisma.comment.findFirst({
      where: { id: req.params.commentId, taskId: req.params.taskId },
      select: { id: true, authorId: true },
    });
    if (!comment) throw ApiError.notFound("Comment not found");

    const isAuthor = comment.authorId === req.user!.id;
    if (!isAuthor && !hasAtLeast(req.membershipRole!, Role.ADMIN)) {
      throw ApiError.forbidden("Only the author or a project admin can delete this comment");
    }

    await prisma.comment.delete({ where: { id: comment.id } });
    res.status(204).send();
  }),
);
