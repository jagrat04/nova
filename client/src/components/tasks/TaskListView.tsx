import { CheckCircle2, MessageSquare } from "lucide-react";
import { PRIORITY_META, STATUS_META } from "../../lib/constants";
import { classNames, formatDueDate, isOverdue } from "../../lib/format";
import type { Task } from "../../lib/types";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Feedback";

interface Props {
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  showProject?: boolean;
}

/** Dense table view of the same tasks the board shows. */
export function TaskListView({ tasks, onOpenTask, showProject }: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Task</th>
              {showProject && <th className="px-4 py-3 font-semibold">Project</th>}
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Assignee</th>
              <th className="px-4 py-3 font-semibold">Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onOpenTask(task.id)}
                className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {task.status === "DONE" && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                      {task.project.key}-{task.number}
                    </span>
                    <span
                      className={classNames(
                        "font-medium text-slate-900",
                        task.status === "DONE" && "text-slate-500 line-through",
                      )}
                    >
                      {task.title}
                    </span>
                    {task._count.comments > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {task._count.comments}
                      </span>
                    )}
                  </div>
                </td>

                {showProject && (
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: task.project.color }}
                      />
                      {task.project.name}
                    </span>
                  </td>
                )}

                <td className="px-4 py-3">
                  <Badge className={STATUS_META[task.status].chip}>
                    {STATUS_META[task.status].label}
                  </Badge>
                </td>

                <td className="px-4 py-3">
                  <Badge className={PRIORITY_META[task.priority].chip}>
                    {PRIORITY_META[task.priority].label}
                  </Badge>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar user={task.assignee} size="xs" />
                    <span className="text-slate-600">{task.assignee?.name ?? "Unassigned"}</span>
                  </div>
                </td>

                <td
                  className={classNames(
                    "px-4 py-3",
                    isOverdue(task.dueDate, task.status)
                      ? "font-medium text-rose-600"
                      : "text-slate-500",
                  )}
                >
                  {formatDueDate(task.dueDate) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
