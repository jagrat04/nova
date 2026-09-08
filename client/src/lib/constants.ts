import type { Priority, ProjectStatus, Role, TaskStatus } from "./types";

export const TASK_STATUSES: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
];

export const STATUS_META: Record<
  TaskStatus,
  { label: string; dot: string; chip: string; column: string }
> = {
  BACKLOG: {
    label: "Backlog",
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-600",
    column: "border-slate-300",
  },
  TODO: {
    label: "To do",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700",
    column: "border-sky-400",
  },
  IN_PROGRESS: {
    label: "In progress",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700",
    column: "border-amber-400",
  },
  IN_REVIEW: {
    label: "In review",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700",
    column: "border-violet-400",
  },
  DONE: {
    label: "Done",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700",
    column: "border-emerald-400",
  },
};

export const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const PRIORITY_META: Record<Priority, { label: string; chip: string; bar: string }> = {
  LOW: { label: "Low", chip: "bg-slate-100 text-slate-600", bar: "bg-slate-400" },
  MEDIUM: { label: "Medium", chip: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
  HIGH: { label: "High", chip: "bg-orange-50 text-orange-700", bar: "bg-orange-500" },
  URGENT: { label: "Urgent", chip: "bg-rose-50 text-rose-700", bar: "bg-rose-500" },
};

export const PROJECT_STATUSES: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; chip: string }> = {
  ACTIVE: { label: "Active", chip: "bg-emerald-50 text-emerald-700" },
  ON_HOLD: { label: "On hold", chip: "bg-amber-50 text-amber-700" },
  COMPLETED: { label: "Completed", chip: "bg-sky-50 text-sky-700" },
  ARCHIVED: { label: "Archived", chip: "bg-slate-100 text-slate-600" },
};

export const ROLE_META: Record<Role, { label: string; chip: string; hint: string }> = {
  OWNER: {
    label: "Owner",
    chip: "bg-brand-50 text-brand-700",
    hint: "Full control, including deleting the project",
  },
  ADMIN: {
    label: "Admin",
    chip: "bg-violet-50 text-violet-700",
    hint: "Manage members, settings and all tasks",
  },
  MEMBER: {
    label: "Member",
    chip: "bg-sky-50 text-sky-700",
    hint: "Create and edit tasks and comments",
  },
  VIEWER: {
    label: "Viewer",
    chip: "bg-slate-100 text-slate-600",
    hint: "Read-only access to the project",
  },
};

/** Roles an admin can hand out (ownership transfers are a separate action). */
export const ASSIGNABLE_ROLES: Role[] = ["ADMIN", "MEMBER", "VIEWER"];

export const PROJECT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#64748b",
];

const RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

/** Mirrors the server's role hierarchy so the UI can hide actions that would 403. */
export function can(role: Role | undefined, minimum: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[minimum];
}
