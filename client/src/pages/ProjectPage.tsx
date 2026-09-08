import { useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  Activity as ActivityIcon,
  BarChart3,
  Columns3,
  List,
  Plus,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { errorMessage } from "../lib/api";
import {
  PRIORITIES,
  PRIORITY_META,
  PROJECT_STATUS_META,
  ROLE_META,
  STATUS_META,
  TASK_STATUSES,
  can,
} from "../lib/constants";
import { classNames, formatDate } from "../lib/format";
import { useDeleteProject, useProject, useProjectActivity, useProjectStats } from "../hooks/useProjects";
import { useTasks, type TaskFilters } from "../hooks/useTasks";
import type { TaskStatus } from "../lib/types";
import { ActivityFeed } from "../components/ActivityFeed";
import {
  DistributionBars,
  PRIORITY_CHART_COLORS,
  STATUS_CHART_COLORS,
} from "../components/charts/DistributionBars";
import { MembersPanel } from "../components/members/MembersPanel";
import { ProjectFormModal } from "../components/projects/ProjectFormModal";
import { KanbanBoard } from "../components/tasks/KanbanBoard";
import { TaskDetailModal } from "../components/tasks/TaskDetailModal";
import { TaskFilterBar } from "../components/tasks/TaskFilterBar";
import { TaskFormModal } from "../components/tasks/TaskFormModal";
import { TaskListView } from "../components/tasks/TaskListView";
import { AvatarGroup } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageLoader,
  ProgressBar,
} from "../components/ui/Feedback";

const TABS = [
  { to: "", label: "Board", icon: Columns3, end: true },
  { to: "list", label: "List", icon: List, end: false },
  { to: "overview", label: "Overview", icon: BarChart3, end: false },
  { to: "members", label: "Members", icon: Users, end: false },
  { to: "activity", label: "Activity", icon: ActivityIcon, end: false },
];

export default function ProjectPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();

  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const [filters, setFilters] = useState<TaskFilters>({});
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(projectId, filters);

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [creatingStatus, setCreatingStatus] = useState<TaskStatus | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteProject = useDeleteProject();

  if (isLoading) return <PageLoader label="Loading project" />;
  if (error || !project) {
    return (
      <ErrorState
        message={errorMessage(error, "This project could not be loaded")}
        onRetry={() => refetch()}
      />
    );
  }

  const canEdit = can(project.role, "MEMBER");
  const isAdmin = can(project.role, "ADMIN");
  const isOwner = project.role === "OWNER";

  async function handleDeleteProject() {
    try {
      await deleteProject.mutateAsync(projectId);
      toast.success("Project deleted");
      navigate("/projects");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <header className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className="mt-1.5 h-10 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                {project.key}
              </span>
              <Badge className={PROJECT_STATUS_META[project.status].chip}>
                {PROJECT_STATUS_META[project.status].label}
              </Badge>
              <Badge className={ROLE_META[project.role].chip}>
                {ROLE_META[project.role].label}
              </Badge>
            </div>
            {project.description && (
              <p className="mt-1.5 max-w-3xl text-sm text-slate-500">{project.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span>Owner: {project.owner.name}</span>
              {project.startDate && <span>Started {formatDate(project.startDate)}</span>}
              {project.dueDate && <span>Target {formatDate(project.dueDate)}</span>}
              <span>{project._count.members} members</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AvatarGroup users={project.members.map((m) => m.user)} />
            {canEdit && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreatingStatus("TODO")}>
                New task
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="secondary"
                icon={<Settings className="h-4 w-4" />}
                onClick={() => setEditingProject(true)}
                aria-label="Project settings"
              >
                Settings
              </Button>
            )}
            {isOwner && (
              <Button
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmingDelete(true)}
                aria-label="Delete project"
              />
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">
              {project.progress.completed} of {project.progress.total} tasks complete
            </span>
            <span className="font-semibold text-slate-900">{project.progress.percent}%</span>
          </div>
          <ProgressBar percent={project.progress.percent} color={project.color} />
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              classNames(
                "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route
          index
          element={
            <div className="space-y-4">
              <TaskFilterBar filters={filters} onChange={setFilters} members={project.members} />
              {tasksLoading ? (
                <PageLoader label="Loading tasks" />
              ) : (
                <KanbanBoard
                  projectId={projectId}
                  tasks={tasks}
                  canEdit={canEdit}
                  onOpenTask={setOpenTaskId}
                  onAddTask={setCreatingStatus}
                />
              )}
            </div>
          }
        />

        <Route
          path="list"
          element={
            <div className="space-y-4">
              <TaskFilterBar filters={filters} onChange={setFilters} members={project.members} />
              {tasksLoading ? (
                <PageLoader label="Loading tasks" />
              ) : tasks.length === 0 ? (
                <EmptyState
                  icon={<List className="h-6 w-6" />}
                  title="No tasks match these filters"
                  description="Adjust the filters, or add the first task to this project."
                />
              ) : (
                <TaskListView tasks={tasks} onOpenTask={setOpenTaskId} />
              )}
            </div>
          }
        />

        <Route path="overview" element={<OverviewTab projectId={projectId} />} />
        <Route path="members" element={<MembersPanel projectId={projectId} role={project.role} />} />
        <Route path="activity" element={<ActivityTab projectId={projectId} />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>

      <TaskDetailModal
        taskId={openTaskId}
        projectId={projectId}
        members={project.members}
        role={project.role}
        onClose={() => setOpenTaskId(null)}
      />

      <TaskFormModal
        open={!!creatingStatus}
        onClose={() => setCreatingStatus(null)}
        projectId={projectId}
        members={project.members}
        defaultStatus={creatingStatus ?? "TODO"}
      />

      <ProjectFormModal
        open={editingProject}
        onClose={() => setEditingProject(false)}
        project={project}
      />

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${project.name}?`}
        message="Every task, comment and membership in this project is permanently removed. This cannot be undone."
        confirmLabel="Delete project"
        loading={deleteProject.isPending}
        onConfirm={handleDeleteProject}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

function OverviewTab({ projectId }: { projectId: string }) {
  const { data, isLoading, error, refetch } = useProjectStats(projectId);

  if (isLoading) return <PageLoader label="Loading overview" />;
  if (error || !data) {
    return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  }

  const workload = [...data.workload].sort((a, b) => b.openTasks - a.openTasks);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="card p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Tasks by stage</h2>
        <DistributionBars
          rows={TASK_STATUSES.map((status) => ({
            key: status,
            label: STATUS_META[status].label,
            value: data.byStatus[status] ?? 0,
            color: STATUS_CHART_COLORS[status],
          }))}
          emptyLabel="No tasks in this project yet."
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Tasks by priority</h2>
        <DistributionBars
          rows={PRIORITIES.map((priority) => ({
            key: priority,
            label: PRIORITY_META[priority].label,
            value: data.byPriority[priority] ?? 0,
            color: PRIORITY_CHART_COLORS[priority],
          }))}
          emptyLabel="No tasks in this project yet."
        />
        {data.overdue > 0 && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {data.overdue} open {data.overdue === 1 ? "task is" : "tasks are"} past their due date.
          </p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold text-slate-900">Open work per person</h2>
        <p className="mb-4 text-sm text-slate-500">Tasks not yet done</p>
        <DistributionBars
          rows={workload.map((row) => ({
            key: row.user?.id ?? "unassigned",
            label: row.user?.name ?? "Unassigned",
            value: row.openTasks,
            color: row.user?.avatarColor ?? "#94a3b8",
          }))}
          emptyLabel="Everything here is done."
        />
      </section>
    </div>
  );
}

function ActivityTab({ projectId }: { projectId: string }) {
  const { data, isLoading, error, refetch } = useProjectActivity(projectId, 50);

  if (isLoading) return <PageLoader label="Loading activity" />;
  if (error || !data) {
    return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  }

  return (
    <section className="card max-w-3xl p-5">
      <h2 className="mb-4 font-semibold text-slate-900">Project activity</h2>
      <ActivityFeed activities={data} emptyLabel="Nothing has happened in this project yet." />
    </section>
  );
}
