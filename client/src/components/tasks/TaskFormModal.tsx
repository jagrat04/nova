import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { errorMessage } from "../../lib/api";
import { PRIORITIES, PRIORITY_META, STATUS_META, TASK_STATUSES } from "../../lib/constants";
import { toDateInput } from "../../lib/format";
import { useCreateTask, useUpdateTask } from "../../hooks/useTasks";
import type { Priority, ProjectMember, Task, TaskStatus } from "../../lib/types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members: ProjectMember[];
  /** Pass a task to edit it; omit to create a new one. */
  task?: Task;
  /** Column the "+" was clicked in, used as the default status for new tasks. */
  defaultStatus?: TaskStatus;
}

export function TaskFormModal({
  open,
  onClose,
  projectId,
  members,
  task,
  defaultStatus = "TODO",
}: Props) {
  const isEdit = !!task;
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: defaultStatus as TaskStatus,
    priority: "MEDIUM" as Priority,
    assigneeId: "",
    dueDate: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? defaultStatus,
      priority: task?.priority ?? "MEDIUM",
      assigneeId: task?.assigneeId ?? "",
      dueDate: toDateInput(task?.dueDate),
    });
  }, [open, task, defaultStatus]);

  const pending = createTask.isPending || updateTask.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || null,
      dueDate: form.dueDate || null,
    };

    try {
      if (isEdit) {
        await updateTask.mutateAsync({ taskId: task.id, input: payload });
        toast.success("Task updated");
      } else {
        await createTask.mutateAsync(payload);
        toast.success("Task created");
      }
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${task.project.key}-${task.number}` : "New task"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" loading={pending}>
            {isEdit ? "Save changes" : "Create task"}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="task-title">
            Title
          </label>
          <input
            id="task-title"
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Wire up the settings page"
            required
            minLength={2}
            maxLength={160}
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="task-description">
            Description
          </label>
          <textarea
            id="task-description"
            className="input min-h-[110px] resize-y"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Add context, acceptance criteria, links..."
            maxLength={5000}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="task-status">
              Status
            </label>
            <select
              id="task-status"
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="task-priority">
              Priority
            </label>
            <select
              id="task-priority"
              className="input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_META[priority].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="task-assignee">
              Assignee
            </label>
            <select
              id="task-assignee"
              className="input"
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {members.map(({ user }) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="task-due">
              Due date
            </label>
            <input
              id="task-due"
              type="date"
              className="input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
