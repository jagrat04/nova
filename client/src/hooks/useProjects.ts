import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Activity, Project, ProjectStats, ProjectStatus } from "../lib/types";

export const projectKeys = {
  all: ["projects"] as const,
  list: (filters: { status?: ProjectStatus; q?: string }) => ["projects", filters] as const,
  detail: (id: string) => ["project", id] as const,
  activity: (id: string) => ["project", id, "activity"] as const,
  stats: (id: string) => ["project", id, "stats"] as const,
};

export interface ProjectInput {
  name: string;
  key?: string;
  description?: string | null;
  color?: string;
  status?: ProjectStatus;
  startDate?: string | null;
  dueDate?: string | null;
}

export function useProjects(filters: { status?: ProjectStatus; q?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();

  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => api.get<{ projects: Project[] }>(`/projects${query ? `?${query}` : ""}`),
    select: (data) => data.projects,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId ?? ""),
    queryFn: () => api.get<{ project: Project }>(`/projects/${projectId}`),
    select: (data) => data.project,
    enabled: !!projectId,
  });
}

export function useProjectActivity(projectId: string | undefined, limit = 30) {
  return useQuery({
    queryKey: projectKeys.activity(projectId ?? ""),
    queryFn: () =>
      api.get<{ activities: Activity[] }>(`/projects/${projectId}/activity?limit=${limit}`),
    select: (data) => data.activities,
    enabled: !!projectId,
  });
}

export function useProjectStats(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.stats(projectId ?? ""),
    queryFn: () => api.get<ProjectStats>(`/projects/${projectId}/stats`),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) =>
      api.post<{ project: Project }>("/projects", input).then((r) => r.project),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProjectInput>) =>
      api.patch<{ project: Project }>(`/projects/${projectId}`, input).then((r) => r.project),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(projectId), { project });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => api.delete<void>(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
