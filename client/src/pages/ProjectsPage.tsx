import { useState } from "react";
import { FolderKanban, Plus, Search } from "lucide-react";
import { useProjects } from "../hooks/useProjects";
import { errorMessage } from "../lib/api";
import { PROJECT_STATUSES, PROJECT_STATUS_META } from "../lib/constants";
import { classNames } from "../lib/format";
import type { ProjectStatus } from "../lib/types";
import { ProjectCard } from "../components/projects/ProjectCard";
import { ProjectFormModal } from "../components/projects/ProjectFormModal";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";

export default function ProjectsPage() {
  const [status, setStatus] = useState<ProjectStatus | undefined>();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: projects, isLoading, error, refetch } = useProjects({ status });

  // The status filter runs server-side; the text box filters what is already loaded
  // so typing stays instant.
  const visible = (projects ?? []).filter((project) =>
    `${project.name} ${project.key} ${project.description ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every project you own or collaborate on.
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
          New project
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={!status} onClick={() => setStatus(undefined)}>
            All
          </FilterChip>
          {PROJECT_STATUSES.map((value) => (
            <FilterChip key={value} active={status === value} onClick={() => setStatus(value)}>
              {PROJECT_STATUS_META[value].label}
            </FilterChip>
          ))}
        </div>
      </div>

      {error && <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      )}

      {!isLoading && !error && visible.length === 0 && (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title={search || status ? "No projects match those filters" : "No projects yet"}
          description={
            search || status
              ? "Try a different search or clear the status filter."
              : "Create your first project to start planning work with your team."
          }
          action={
            !search && !status ? (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                New project
              </Button>
            ) : undefined
          }
        />
      )}

      {visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}
