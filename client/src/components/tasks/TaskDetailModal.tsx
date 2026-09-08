import { useState } from "react";
import { Pencil, Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { errorMessage } from "../../lib/api";
import { PRIORITIES, PRIORITY_META, STATUS_META, TASK_STATUSES, can } from "../../lib/constants";
import { classNames, formatDate, isOverdue, timeAgo } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import {
  useAddComment,
  useDeleteComment,
  useDeleteTask,
  useTask,
  useUpdateTask,
} from "../../hooks/useTasks";
import type { Priority, ProjectMember, Role, TaskStatus } from "../../lib/types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Badge, ConfirmDialog, ErrorState, PageLoader } from "../ui/Feedback";
import { Modal } from "../ui/Modal";
import { TaskFormModal } from "./TaskFormModal";

interface Props {
  taskId: string | null;
  projectId: string;
  members: ProjectMember[];
  role: Role | undefined;
  onClose: () => void;
}

export function TaskDetailModal({ taskId, projectId, members, role, onClose }: Props) {
  const { user } = useAuth();
  const { data: task, isLoading, error, refetch } = useTask(taskId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const addComment = useAddComment(projectId, taskId ?? "");
  const deleteComment = useDeleteComment(projectId, taskId ?? "");

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [commentBody, setCommentBody] = useState("");

  const canEdit = can(role, "MEMBER");

  function patch(input: { status?: TaskStatus; priority?: Priority; assigneeId?: string | null }) {
    if (!taskId) return;
    updateTask.mutate(
      { taskId, input },
      { onError: (err) => toast.error(errorMessage(err, "Could not update the task")) },
    );
  }

  async function handleComment(event: React.FormEvent) {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body) return;
    try {
      await addComment.mutateAsync(body);
      setCommentBody("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function handleDelete() {
    if (!taskId) return;
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success("Task deleted");
      setConfirmingDelete(false);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <Modal
        open={!!taskId && !editing}
        onClose={onClose}
        size="lg"
        title={
          task ? (
            <span className="flex items-center gap-2">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                {task.project.key}-{task.number}
              </span>
              <span className="truncate">{task.title}</span>
            </span>
          ) : (
            "Task"
          )
        }
        description={
          task ? `Created by ${task.createdBy.name} on ${formatDate(task.createdAt)}` : undefined
        }
      >
        {isLoading && <PageLoader label="Loading task" />}
        {error && <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />}

        {task && (
          <div className="grid gap-6 md:grid-cols-[1fr,220px]">
            <div className="min-w-0 space-y-6">
              <section>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Description
                </h3>
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {task.description || <span className="text-slate-400">No description yet.</span>}
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Comments ({task.comments.length})
                </h3>

                <ul className="space-y-4">
                  {task.comments.map((comment) => (
                    <li key={comment.id} className="flex gap-3">
                      <Avatar user={comment.author} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {comment.author.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {timeAgo(comment.createdAt)}
                          </span>
                          {(comment.authorId === user?.id || can(role, "ADMIN")) && (
                            <button
                              onClick={() => deleteComment.mutate(comment.id)}
                              aria-label="Delete comment"
                              className="ml-auto rounded p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
                          {comment.body}
                        </p>
                      </div>
                    </li>
                  ))}
                  {task.comments.length === 0 && (
                    <li className="text-sm text-slate-400">No comments yet.</li>
                  )}
                </ul>

                {canEdit && (
                  <form onSubmit={handleComment} className="mt-4 flex gap-2">
                    <input
                      className="input"
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Write a comment..."
                      maxLength={2000}
                      aria-label="Write a comment"
                    />
                    <Button
                      type="submit"
                      loading={addComment.isPending}
                      disabled={!commentBody.trim()}
                      icon={<Send className="h-4 w-4" />}
                    >
                      Send
                    </Button>
                  </form>
                )}
              </section>
            </div>

            <aside className="space-y-4">
              <Field label="Status">
                <select
                  className="input"
                  value={task.status}
                  disabled={!canEdit}
                  onChange={(e) => patch({ status: e.target.value as TaskStatus })}
                  aria-label="Status"
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_META[status].label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Priority">
                <select
                  className="input"
                  value={task.priority}
                  disabled={!canEdit}
                  onChange={(e) => patch({ priority: e.target.value as Priority })}
                  aria-label="Priority"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_META[priority].label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Assignee">
                <select
                  className="input"
                  value={task.assigneeId ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => patch({ assigneeId: e.target.value || null })}
                  aria-label="Assignee"
                >
                  <option value="">Unassigned</option>
                  {members.map(({ user: member }) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Due date">
                {task.dueDate ? (
                  <p
                    className={classNames(
                      "text-sm",
                      isOverdue(task.dueDate, task.status)
                        ? "font-medium text-rose-600"
                        : "text-slate-700",
                    )}
                  >
                    {formatDate(task.dueDate)}
                    {isOverdue(task.dueDate, task.status) && " (overdue)"}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">No due date</p>
                )}
              </Field>

              {task.completedAt && (
                <Field label="Completed">
                  <Badge className={STATUS_META.DONE.chip}>{formatDate(task.completedAt)}</Badge>
                </Field>
              )}

              {canEdit && (
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <Button
                    variant="secondary"
                    className="w-full"
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={() => setEditing(true)}
                  >
                    Edit task
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-rose-600 hover:bg-rose-50"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setConfirmingDelete(true)}
                  >
                    Delete task
                  </Button>
                </div>
              )}
            </aside>
          </div>
        )}
      </Modal>

      {task && (
        <TaskFormModal
          open={editing}
          onClose={() => setEditing(false)}
          projectId={projectId}
          members={members}
          task={task}
        />
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this task?"
        message="The task and its comments will be permanently removed. This cannot be undone."
        loading={deleteTask.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </div>
  );
}
