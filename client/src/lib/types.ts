export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface User {
  id: string;
  name: string;
  email: string;
  title: string | null;
  avatarColor: string;
}

export interface ProjectMember {
  role: Role;
  joinedAt: string;
  user: User;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: string;
}

export interface Progress {
  total: number;
  completed: number;
  percent: number;
  byStatus: Record<TaskStatus, number>;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: User;
  members: ProjectMember[];
  _count: { tasks: number; members: number };
  role: Role;
  progress: Progress;
}

export interface Task {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  position: number;
  dueDate: string | null;
  completedAt: string | null;
  projectId: string;
  assigneeId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignee: User | null;
  createdBy: User;
  project: { id: string; name: string; key: string; color: string };
  _count: { comments: number };
}

export interface Comment {
  id: string;
  body: string;
  taskId: string;
  authorId: string;
  createdAt: string;
  author: User;
}

export interface TaskDetail extends Task {
  comments: Comment[];
}

export interface Activity {
  id: string;
  projectId: string;
  action: string;
  summary: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  actor: User;
  project?: { id: string; name: string; key: string; color: string };
}

export interface DashboardData {
  summary: {
    projects: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    openTasks: number;
    completionRate: number;
  };
  byStatus: Partial<Record<TaskStatus, number>>;
  myTasks: Task[];
  upcoming: Task[];
  trend: { date: string; completed: number }[];
  activities: Activity[];
}

export interface ProjectStats {
  byStatus: Partial<Record<TaskStatus, number>>;
  byPriority: Partial<Record<Priority, number>>;
  workload: { user: User | null; openTasks: number }[];
  overdue: number;
}
