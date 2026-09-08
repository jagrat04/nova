import { Search, X } from "lucide-react";
import { PRIORITIES, PRIORITY_META } from "../../lib/constants";
import type { TaskFilters } from "../../hooks/useTasks";
import type { ProjectMember } from "../../lib/types";
import { Button } from "../ui/Button";

interface Props {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  members: ProjectMember[];
}

export function TaskFilterBar({ filters, onChange, members }: Props) {
  const active = !!(filters.q || filters.priority || filters.assigneeId || filters.overdue);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          value={filters.q ?? ""}
          onChange={(e) => onChange({ ...filters, q: e.target.value || undefined })}
          placeholder="Search tasks"
          aria-label="Search tasks"
        />
      </div>

      <select
        className="input w-auto"
        value={filters.assigneeId ?? ""}
        onChange={(e) => onChange({ ...filters, assigneeId: e.target.value || undefined })}
        aria-label="Filter by assignee"
      >
        <option value="">Everyone</option>
        <option value="unassigned">Unassigned</option>
        {members.map(({ user }) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>

      <select
        className="input w-auto"
        value={filters.priority ?? ""}
        onChange={(e) =>
          onChange({ ...filters, priority: (e.target.value || undefined) as TaskFilters["priority"] })
        }
        aria-label="Filter by priority"
      >
        <option value="">Any priority</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_META[priority].label}
          </option>
        ))}
      </select>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          checked={!!filters.overdue}
          onChange={(e) => onChange({ ...filters, overdue: e.target.checked || undefined })}
        />
        Overdue only
      </label>

      {active && (
        <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={() => onChange({})}>
          Clear
        </Button>
      )}
    </div>
  );
}
