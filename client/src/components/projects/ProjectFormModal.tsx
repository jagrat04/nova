import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { errorMessage } from "../../lib/api";
import { PROJECT_COLORS, PROJECT_STATUSES, PROJECT_STATUS_META } from "../../lib/constants";
import { classNames, toDateInput } from "../../lib/format";
import { useCreateProject, useUpdateProject } from "../../hooks/useProjects";
import type { Project, ProjectStatus } from "../../lib/types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Omit to create a new project; pass one to edit it. */
  project?: Project;
}

const BLANK = {
  name: "",
  key: "",
  description: "",
  color: PROJECT_COLORS[0],
  status: "ACTIVE" as ProjectStatus,
  startDate: "",
  dueDate: "",
};

export function ProjectFormModal({ open, onClose, project }: Props) {
  const isEdit = !!project;
  const navigate = useNavigate();
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? "");
  const [form, setForm] = useState(BLANK);

  // Reload the form whenever the dialog opens so stale edits never leak between projects.
  useEffect(() => {
    if (!open) return;
    setForm(
      project
        ? {
            name: project.name,
            key: project.key,
            description: project.description ?? "",
            color: project.color,
            status: project.status,
            startDate: toDateInput(project.startDate),
            dueDate: toDateInput(project.dueDate),
          }
        : BLANK,
    );
  }, [open, project]);

  const pending = create.isPending || update.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      key: form.key.trim() ? form.key.trim().toUpperCase() : undefined,
      description: form.description.trim() || null,
      color: form.color,
      status: form.status,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
    };

    try {
      if (isEdit) {
        await update.mutateAsync(payload);
        toast.success("Project updated");
      } else {
        const created = await create.mutateAsync(payload);
        toast.success(`${created.name} created`);
        navigate(`/projects/${created.id}`);
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
      title={isEdit ? "Project settings" : "New project"}
      description={
        isEdit ? "Update the details your team sees." : "Give the work a home. You can change all of this later."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" loading={pending}>
            {isEdit ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr,140px]">
          <div>
            <label className="label" htmlFor="project-name">
              Project name
            </label>
            <input
              id="project-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Website redesign"
              required
              minLength={2}
              maxLength={80}
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="project-key">
              Key
            </label>
            <input
              id="project-key"
              className="input uppercase"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
              placeholder="AUTO"
              maxLength={6}
              pattern="[A-Za-z][A-Za-z0-9]{1,5}"
              title="2 to 6 letters or digits, starting with a letter"
            />
            <p className="mt-1 text-xs text-slate-400">Used for task codes</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="project-description">
            Description
          </label>
          <textarea
            id="project-description"
            className="input min-h-[84px] resize-y"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What is this project trying to achieve?"
            maxLength={2000}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="project-start">
              Start date
            </label>
            <input
              id="project-start"
              type="date"
              className="input"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="project-due">
              Target date
            </label>
            <input
              id="project-due"
              type="date"
              className="input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>

        {isEdit && (
          <div>
            <label className="label" htmlFor="project-status">
              Status
            </label>
            <select
              id="project-status"
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_META[status].label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <span className="label">Colour</span>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use colour ${color}`}
                onClick={() => setForm({ ...form, color })}
                style={{ backgroundColor: color }}
                className={classNames(
                  "h-7 w-7 rounded-full transition-transform",
                  form.color === color
                    ? "ring-2 ring-slate-900 ring-offset-2 scale-110"
                    : "hover:scale-110",
                )}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
