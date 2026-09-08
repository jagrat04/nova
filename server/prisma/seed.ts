/**
 * Seeds a demo workspace: five users, three projects and a realistic spread of
 * tasks, comments and activity. Safe to re-run - it clears the tables first.
 *
 *   npm run seed
 *
 * Every demo account uses the password: password123
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Priority, ProjectStatus, Role, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

const PEOPLE = [
  { name: "Jagrat Singh", email: "jagrat@nova.dev", title: "Product Lead", avatarColor: "#6366f1" },
  { name: "Priya Sharma", email: "priya@nova.dev", title: "Frontend Engineer", avatarColor: "#ec4899" },
  { name: "Rahul Verma", email: "rahul@nova.dev", title: "Backend Engineer", avatarColor: "#22c55e" },
  { name: "Neha Gupta", email: "neha@nova.dev", title: "Product Designer", avatarColor: "#f97316" },
  { name: "Arjun Mehta", email: "arjun@nova.dev", title: "QA Engineer", avatarColor: "#0ea5e9" },
];

/** A date `days` from now; negative values are in the past. */
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);

type TaskSeed = {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee: number;
  dueInDays?: number;
  comments?: { author: number; body: string }[];
};

const PROJECTS: {
  name: string;
  key: string;
  description: string;
  color: string;
  status: ProjectStatus;
  dueInDays: number;
  members: { index: number; role: Role }[];
  tasks: TaskSeed[];
}[] = [
  {
    name: "NOVA Web Platform",
    key: "NOVA",
    description:
      "The core team productivity platform - projects, boards, members and reporting in one place.",
    color: "#6366f1",
    status: ProjectStatus.ACTIVE,
    dueInDays: 34,
    members: [
      { index: 0, role: Role.OWNER },
      { index: 1, role: Role.ADMIN },
      { index: 2, role: Role.MEMBER },
      { index: 3, role: Role.MEMBER },
      { index: 4, role: Role.VIEWER },
    ],
    tasks: [
      {
        title: "Set up JWT authentication flow",
        description: "Register, login and session restore backed by hashed passwords and a signed token.",
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        assignee: 2,
        dueInDays: -12,
        comments: [
          { author: 0, body: "Ship the refresh-token story in a follow-up - single token is fine for v1." },
          { author: 2, body: "Done. Tokens expire in 7 days and /auth/me restores the session." },
        ],
      },
      {
        title: "Design the project dashboard",
        description: "Headline metrics, completion trend and an activity feed.",
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        assignee: 3,
        dueInDays: -6,
      },
      {
        title: "Kanban board with drag and drop",
        description: "Five columns, optimistic reordering, and position persistence across reloads.",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        assignee: 1,
        dueInDays: 3,
        comments: [
          { author: 1, body: "Using dnd-kit - keyboard accessible out of the box." },
          { author: 4, body: "Please add a test case for moving the last card in a column." },
        ],
      },
      {
        title: "Role-based access control",
        description: "Owner, admin, member and viewer roles enforced on every write endpoint.",
        status: TaskStatus.IN_REVIEW,
        priority: Priority.HIGH,
        assignee: 2,
        dueInDays: 1,
      },
      {
        title: "Team member invitations",
        description: "Invite by email; pending invites convert to memberships on sign-up.",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        assignee: 0,
        dueInDays: 5,
      },
      {
        title: "Task comments and activity feed",
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        assignee: 1,
        dueInDays: 9,
      },
      {
        title: "Empty and loading states for every view",
        status: TaskStatus.TODO,
        priority: Priority.LOW,
        assignee: 3,
        dueInDays: 12,
      },
      {
        title: "Deploy API to Render and client to Vercel",
        description: "Wire up Neon Postgres, run migrations on deploy, document the environment variables.",
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        assignee: 2,
        dueInDays: 15,
      },
      {
        title: "Dark mode polish pass",
        status: TaskStatus.BACKLOG,
        priority: Priority.LOW,
        assignee: 3,
      },
      {
        title: "Real-time board updates over websockets",
        status: TaskStatus.BACKLOG,
        priority: Priority.MEDIUM,
        assignee: 2,
      },
      {
        title: "Overdue task email digest",
        status: TaskStatus.BACKLOG,
        priority: Priority.LOW,
        assignee: 4,
      },
    ],
  },
  {
    name: "Mobile Companion App",
    key: "MOB",
    description: "React Native client so teams can triage tasks away from a desk.",
    color: "#0ea5e9",
    status: ProjectStatus.ACTIVE,
    dueInDays: 62,
    members: [
      { index: 1, role: Role.OWNER },
      { index: 0, role: Role.ADMIN },
      { index: 4, role: Role.MEMBER },
    ],
    tasks: [
      {
        title: "Expo project setup and CI build",
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        assignee: 1,
        dueInDays: -9,
      },
      {
        title: "Shared API client package",
        description: "Extract the fetch wrapper so web and mobile share types.",
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        assignee: 1,
        dueInDays: -1,
      },
      {
        title: "Push notifications for assignments",
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        assignee: 4,
        dueInDays: 18,
      },
      {
        title: "Offline task drafts",
        status: TaskStatus.BACKLOG,
        priority: Priority.LOW,
        assignee: 0,
      },
    ],
  },
  {
    name: "Q3 Marketing Launch",
    key: "MKT",
    description: "Landing page, launch content and analytics for the public beta.",
    color: "#f97316",
    status: ProjectStatus.ON_HOLD,
    dueInDays: 21,
    members: [
      { index: 3, role: Role.OWNER },
      { index: 0, role: Role.MEMBER },
    ],
    tasks: [
      {
        title: "Landing page copy",
        status: TaskStatus.DONE,
        priority: Priority.MEDIUM,
        assignee: 3,
        dueInDays: -4,
      },
      {
        title: "Product walkthrough video",
        status: TaskStatus.IN_REVIEW,
        priority: Priority.MEDIUM,
        assignee: 0,
        dueInDays: 2,
      },
      {
        title: "Analytics and conversion tracking",
        status: TaskStatus.TODO,
        priority: Priority.LOW,
        assignee: 3,
        dueInDays: 14,
      },
    ],
  },
];

const STATUS_LABEL: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};

async function main() {
  console.log("Clearing existing data...");
  // Order matters only for readability - the schema cascades on delete.
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [];
  for (const person of PEOPLE) {
    users.push(await prisma.user.create({ data: { ...person, passwordHash } }));
  }
  console.log(`Created ${users.length} users`);

  for (const spec of PROJECTS) {
    const owner = users[spec.members.find((m) => m.role === Role.OWNER)!.index];

    const project = await prisma.project.create({
      data: {
        name: spec.name,
        key: spec.key,
        description: spec.description,
        color: spec.color,
        status: spec.status,
        startDate: daysFromNow(-30),
        dueDate: daysFromNow(spec.dueInDays),
        ownerId: owner.id,
        members: {
          create: spec.members.map((m) => ({ userId: users[m.index].id, role: m.role })),
        },
      },
    });

    await prisma.activity.create({
      data: {
        projectId: project.id,
        actorId: owner.id,
        action: "project.created",
        summary: `created the project ${project.name}`,
        createdAt: daysFromNow(-30),
      },
    });

    let number = 0;
    const positions: Partial<Record<TaskStatus, number>> = {};

    for (const spec2 of spec.tasks) {
      number += 1;
      positions[spec2.status] = (positions[spec2.status] ?? 0) + 1000;

      const createdAt = daysFromNow(-Math.min(28, number * 2));
      const task = await prisma.task.create({
        data: {
          number,
          title: spec2.title,
          description: spec2.description,
          status: spec2.status,
          priority: spec2.priority,
          position: positions[spec2.status]!,
          projectId: project.id,
          assigneeId: users[spec2.assignee].id,
          createdById: owner.id,
          dueDate: spec2.dueInDays === undefined ? null : daysFromNow(spec2.dueInDays),
          createdAt,
          // Spread completions across the last two weeks so the trend chart has shape.
          completedAt: spec2.status === TaskStatus.DONE ? daysFromNow(-((number % 12) + 1)) : null,
        },
      });

      await prisma.activity.create({
        data: {
          projectId: project.id,
          actorId: owner.id,
          action: "task.created",
          summary: `created ${project.key}-${task.number} "${task.title}"`,
          meta: { taskId: task.id },
          createdAt,
        },
      });

      if (spec2.status === TaskStatus.DONE || spec2.status === TaskStatus.IN_REVIEW) {
        await prisma.activity.create({
          data: {
            projectId: project.id,
            actorId: users[spec2.assignee].id,
            action: "task.status_changed",
            summary: `moved ${project.key}-${task.number} to ${STATUS_LABEL[spec2.status]}`,
            meta: { taskId: task.id },
            createdAt: task.completedAt ?? daysFromNow(-2),
          },
        });
      }

      for (const comment of spec2.comments ?? []) {
        await prisma.comment.create({
          data: {
            body: comment.body,
            taskId: task.id,
            authorId: users[comment.author].id,
            createdAt: daysFromNow(-((number % 6) + 1)),
          },
        });
        await prisma.activity.create({
          data: {
            projectId: project.id,
            actorId: users[comment.author].id,
            action: "comment.created",
            summary: `commented on ${project.key}-${task.number}`,
            meta: { taskId: task.id },
            createdAt: daysFromNow(-((number % 6) + 1)),
          },
        });
      }
    }

    console.log(`Created project ${project.key} with ${spec.tasks.length} tasks`);
  }

  console.log("\nSeed complete. Sign in with:");
  for (const person of PEOPLE) console.log(`  ${person.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
