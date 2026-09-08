import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Search } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { STATUS_META, TASK_STATUSES } from "../lib/constants";
import { classNames } from "../lib/format";
import type { Task, TaskStatus } from "../lib/types";
import { TaskListView } from "../components/tasks/TaskListView";
import { TaskDetailModal } from "../components/tasks/TaskDetailModal";
import { useProject } from "../hooks/useProjects";
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback";

type Scope = "me" | "unassigned";

export default function MyTasksPage() {
  const [scope, setScope] = useState<Scope>("me");
  const [status, setStatus] = useState<TaskStatus | "OPEN">("OPEN");
  const [search, setSearch] = useState("");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ assignee: scope });
    if (status === "OPEN") params.set("open", "true");
    else params.set("status", status);
    return params.toString();
  }, [scope, status]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-tasks", query],
    queryFn: () => api.get<{ tasks: Task[] }>(`/tasks?${query}`),
    select: (result) => result.tasks,
  });

  const visible = (data ?? []).filter((task) =>
    task.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  // The detail modal needs the member list of whichever project the open task belongs to.
  const openTask = visible.find((task) => task.id === openTaskId);
  const { data: openProject } = useProject(openTask?.projectId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My tasks</h1>
        <p className="mt-1 text-sm text-slate-500">
          Work assigned to you across every project, soonest deadline first.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {(
            [
              ["me", "Assigned to me"],
              ["unassigned", "Unassigned"],
            ] as [Scope, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              className={classNames(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                scope === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          className="input w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | "OPEN")}
          aria-label="Filter by status"
        >
          <option value="OPEN">Open tasks</option>
          {TASK_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_META[value].label}
            </option>
          ))}
        </select>

        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
          />
        </div>
      </div>

      {error && <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />}
      {isLoading && <PageLoader label="Loading tasks" />}

      {!isLoading && !error && visible.length === 0 && (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" />}
          title={scope === "me" ? "Nothing on your plate" : "No unassigned tasks"}
          description={
            scope === "me"
              ? "Tasks assigned to you across all projects will appear here."
              : "Every task in your projects has an owner."
          }
        />
      )}

      {visible.length > 0 && (
        <TaskListView tasks={visible} onOpenTask={setOpenTaskId} showProject />
      )}

      {openTask && openProject && (
        <TaskDetailModal
          taskId={openTaskId}
          projectId={openTask.projectId}
          members={openProject.members}
          role={openProject.role}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  );
}
