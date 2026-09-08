import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../hooks/useDashboard";
import { errorMessage } from "../lib/api";
import { STATUS_META, TASK_STATUSES } from "../lib/constants";
import { classNames, formatDueDate, isOverdue } from "../lib/format";
import { ActivityFeed } from "../components/ActivityFeed";
import { CompletionTrend } from "../components/charts/CompletionTrend";
import { DistributionBars, STATUS_CHART_COLORS } from "../components/charts/DistributionBars";
import { ProjectFormModal } from "../components/projects/ProjectFormModal";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Badge, EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard(14);
  const [creating, setCreating] = useState(false);

  if (error) {
    return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {greeting()}, {user?.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here is where your team's work stands today.
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
          New project
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active projects"
          value={summary?.projects}
          icon={FolderKanban}
          tone="bg-brand-50 text-brand-600"
          loading={isLoading}
        />
        <StatTile
          label="Open tasks"
          value={summary?.openTasks}
          icon={ListTodo}
          tone="bg-sky-50 text-sky-600"
          loading={isLoading}
        />
        <StatTile
          label="Completed"
          value={summary?.completedTasks}
          hint={summary ? `${summary.completionRate}% of all tasks` : undefined}
          icon={CheckCircle2}
          tone="bg-emerald-50 text-emerald-600"
          loading={isLoading}
        />
        <StatTile
          label="Overdue"
          value={summary?.overdueTasks}
          icon={AlertTriangle}
          tone="bg-rose-50 text-rose-600"
          loading={isLoading}
          alert={!!summary?.overdueTasks}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Tasks completed per day</h2>
                <p className="text-sm text-slate-500">Across every project you belong to</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Last 14 days
              </span>
            </div>
            {isLoading ? <Skeleton className="h-[220px]" /> : <CompletionTrend data={data!.trend} />}
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">My open tasks</h2>
              <Link
                to="/my-tasks"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View all
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : data!.myTasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="Nothing assigned to you"
                description="When a teammate assigns you a task it will show up here."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data!.myTasks.slice(0, 6).map((task) => (
                  <li key={task.id}>
                    <Link
                      to={`/projects/${task.projectId}`}
                      className="flex items-center gap-3 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span
                        className="h-8 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: task.project.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {task.project.key}-{task.number} · {task.project.name}
                        </p>
                      </div>
                      <Badge className={STATUS_META[task.status].chip}>
                        {STATUS_META[task.status].label}
                      </Badge>
                      {task.dueDate && (
                        <span
                          className={classNames(
                            "hidden w-20 shrink-0 text-right text-xs sm:block",
                            isOverdue(task.dueDate, task.status)
                              ? "font-medium text-rose-600"
                              : "text-slate-500",
                          )}
                        >
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Tasks by stage</h2>
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <DistributionBars
                rows={TASK_STATUSES.map((status) => ({
                  key: status,
                  label: STATUS_META[status].label,
                  value: data!.byStatus[status] ?? 0,
                  color: STATUS_CHART_COLORS[status],
                }))}
                emptyLabel="No tasks yet."
              />
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Due this week</h2>
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : data!.upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Nothing due in the next seven days.
              </p>
            ) : (
              <ul className="space-y-3">
                {data!.upcoming.map((task) => (
                  <li key={task.id} className="flex items-center gap-3">
                    <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-900">{task.title}</p>
                      <p className="text-xs text-slate-500">{formatDueDate(task.dueDate)}</p>
                    </div>
                    <Avatar user={task.assignee} size="xs" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Recent activity</h2>
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <ActivityFeed activities={data!.activities} showProject />
            )}
          </section>
        </div>
      </div>

      <ProjectFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading,
  alert,
}: {
  label: string;
  value: number | undefined;
  hint?: string;
  icon: LucideIcon;
  tone: string;
  loading: boolean;
  alert?: boolean;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={classNames("flex h-11 w-11 items-center justify-center rounded-xl", tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-12" />
        ) : (
          <p
            className={classNames(
              "text-2xl font-bold tabular-nums tracking-tight",
              alert ? "text-rose-600" : "text-slate-900",
            )}
          >
            {value ?? 0}
          </p>
        )}
        {hint && !loading && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
