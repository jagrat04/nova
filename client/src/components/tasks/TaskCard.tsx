import { CalendarDays, MessageSquare } from "lucide-react";
import { PRIORITY_META } from "../../lib/constants";
import { classNames, formatDueDate, isOverdue } from "../../lib/format";
import type { Task } from "../../lib/types";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Feedback";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  /** True while the card is being dragged, so the original can dim in place. */
  dragging?: boolean;
  showProject?: boolean;
}

export function TaskCard({ task, onClick, dragging, showProject }: TaskCardProps) {
  const due = formatDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div
      onClick={onClick}
      className={classNames(
        "group cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-card transition-shadow hover:shadow-pop",
        dragging && "opacity-40",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-slate-900 group-hover:text-brand-700">
          {task.title}
        </p>
        <span
          className={classNames("mt-1 h-2 w-2 shrink-0 rounded-full", PRIORITY_META[task.priority].bar)}
          title={`${PRIORITY_META[task.priority].label} priority`}
        />
      </div>

      {showProject && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: task.project.color }} />
          {task.project.name}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
          {task.project.key}-{task.number}
        </span>
        <Badge className={PRIORITY_META[task.priority].chip}>
          {PRIORITY_META[task.priority].label}
        </Badge>
        {due && (
          <span
            className={classNames(
              "inline-flex items-center gap-1 text-xs",
              overdue ? "font-medium text-rose-600" : "text-slate-500",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {due}
          </span>
        )}
        {task._count.comments > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <MessageSquare className="h-3.5 w-3.5" />
            {task._count.comments}
          </span>
        )}
        <span className="ml-auto">
          <Avatar user={task.assignee} size="xs" />
        </span>
      </div>
    </div>
  );
}
