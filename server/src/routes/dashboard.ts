import { Router } from "express";
import { z } from "zod";
import { TaskStatus } from "@prisma/client";
import { asyncHandler } from "../lib/async.js";
import { prisma } from "../lib/prisma.js";
import { publicUserSelect, taskInclude } from "../lib/serializers.js";

const router = Router();

/** Midnight of the day `daysAgo` days before today, in server local time. */
function startOfDay(daysAgo = 0): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/** GET /api/dashboard - headline numbers, my open work, and a completion trend. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { days } = z
      .object({ days: z.coerce.number().int().min(7).max(60).default(14) })
      .parse(req.query);

    const userId = req.user!.id;

    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberships.map((m) => m.projectId);
    const scope = { projectId: { in: projectIds } };

    const trendStart = startOfDay(days - 1);

    const [
      projectCount,
      totalTasks,
      completedTasks,
      overdueTasks,
      myOpenTasks,
      statusGroups,
      completedInWindow,
      activities,
      upcoming,
    ] = await Promise.all([
      prisma.project.count({ where: { id: { in: projectIds } } }),
      prisma.task.count({ where: scope }),
      prisma.task.count({ where: { ...scope, status: TaskStatus.DONE } }),
      prisma.task.count({
        where: { ...scope, status: { not: TaskStatus.DONE }, dueDate: { lt: new Date() } },
      }),
      prisma.task.findMany({
        where: { ...scope, assigneeId: userId, status: { not: TaskStatus.DONE } },
        include: taskInclude,
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
        take: 12,
      }),
      prisma.task.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
      prisma.task.findMany({
        where: { ...scope, status: TaskStatus.DONE, completedAt: { gte: trendStart } },
        select: { completedAt: true },
      }),
      prisma.activity.findMany({
        where: scope,
        include: {
          actor: { select: publicUserSelect },
          project: { select: { id: true, name: true, key: true, color: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.task.findMany({
        where: {
          ...scope,
          status: { not: TaskStatus.DONE },
          dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) },
        },
        include: taskInclude,
        orderBy: { dueDate: "asc" },
        take: 8,
      }),
    ]);

    // Bucket completions into one entry per day so the chart always has a full window.
    const trend: { date: string; completed: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(i);
      const next = new Date(day.getTime() + 86_400_000);
      trend.push({
        date: day.toISOString().slice(0, 10),
        completed: completedInWindow.filter(
          (t) => t.completedAt && t.completedAt >= day && t.completedAt < next,
        ).length,
      });
    }

    res.json({
      summary: {
        projects: projectCount,
        totalTasks,
        completedTasks,
        overdueTasks,
        openTasks: totalTasks - completedTasks,
        completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
      },
      byStatus: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
      myTasks: myOpenTasks,
      upcoming,
      trend,
      activities,
    });
  }),
);

export default router;
