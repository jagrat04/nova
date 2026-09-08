import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, ListTodo } from "lucide-react";
import { PROJECT_STATUS_META, ROLE_META } from "../../lib/constants";
import { classNames, formatDate, isOverdue } from "../../lib/format";
import type { Project } from "../../lib/types";
import { AvatarGroup } from "../ui/Avatar";
import { Badge, ProgressBar } from "../ui/Feedback";

export function ProjectCard({ project }: { project: Project }) {
  const overdue = isOverdue(project.dueDate, project.status === "COMPLETED" ? "DONE" : "TODO");

  return (
    <Link
      to={`/projects/${project.id}`}
      className="card group flex flex-col gap-4 p-5 transition-shadow hover:shadow-pop"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-sm"
          style={{ backgroundColor: project.color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold leading-snug text-slate-900 group-hover:text-brand-700">
              {project.name}
            </h3>
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
              {project.key}
            </span>
            <Badge className={PROJECT_STATUS_META[project.status].chip}>
              {PROJECT_STATUS_META[project.status].label}
            </Badge>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
            {project.description || "No description yet"}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">
            {project.progress.completed} of {project.progress.total} tasks done
          </span>
          <span className="font-semibold text-slate-900">{project.progress.percent}%</span>
        </div>
        <ProgressBar percent={project.progress.percent} color={project.color} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <AvatarGroup users={project.members.map((m) => m.user)} size="xs" />
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <ListTodo className="h-3.5 w-3.5" />
            {project._count.tasks}
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {project.progress.completed}
          </span>
          {project.dueDate && (
            <span
              className={classNames(
                "inline-flex items-center gap-1",
                overdue && "font-medium text-rose-600",
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(project.dueDate, "d MMM")}
            </span>
          )}
          <Badge className={ROLE_META[project.role].chip}>{ROLE_META[project.role].label}</Badge>
        </div>
      </div>
    </Link>
  );
}
