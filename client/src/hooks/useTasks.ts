import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { projectKeys } from "./useProjects";
import type { Comment, Priority, Task, TaskDetail, TaskStatus } from "../lib/types";

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  q?: string;
  overdue?: boolean;
}

export const taskKeys = {
  list: (projectId: string, filters: TaskFilters) => ["tasks", projectId, filters] as const,
  listRoot: (projectId: string) => ["tasks", projectId] as const,
  detail: (taskId: string) => ["task", taskId] as const,
};

export interface TaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | null;
  position?: number;
}

function toQueryString(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters.q) params.set("q", filters.q);
  if (filters.overdue) params.set("overdue", "true");
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function useTasks(projectId: string | undefined, filters: TaskFilters = {}) {
  return useQuery({
    queryKey: taskKeys.list(projectId ?? "", filters),
    queryFn: () =>
      api.get<{ tasks: Task[] }>(`/projects/${projectId}/tasks${toQueryString(filters)}`),
    select: (data) => data.tasks,
    enabled: !!projectId,
  });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(taskId ?? ""),
    queryFn: () => api.get<{ task: TaskDetail }>(`/tasks/${taskId}`),
    select: (data) => data.task,
    enabled: !!taskId,
  });
}

/** Invalidates everything a task write can affect: lists, detail, progress and the dashboard. */
function useTaskInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return (taskId?: string) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.listRoot(projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.activity(projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.stats(projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    if (taskId) queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  };
}

export function useCreateTask(projectId: string) {
  const invalidate = useTaskInvalidation(projectId);
  return useMutation({
    mutationFn: (input: TaskInput) =>
      api.post<{ task: Task }>(`/projects/${projectId}/tasks`, input).then((r) => r.task),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();
  const invalidate = useTaskInvalidation(projectId);

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: Partial<TaskInput> }) =>
      api.patch<{ task: Task }>(`/tasks/${taskId}`, input).then((r) => r.task),

    // Move the card immediately; the board would feel laggy waiting for the round-trip.
    onMutate: async ({ taskId, input }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.listRoot(projectId) });
      const snapshots = queryClient.getQueriesData<{ tasks: Task[] }>({
        queryKey: taskKeys.listRoot(projectId),
      });

      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData(key, {
          tasks: data.tasks.map((task) => (task.id === taskId ? { ...task, ...input } : task)),
        });
      }
      return { snapshots };
    },

    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) queryClient.setQueryData(key, data);
    },

    onSettled: (_data, _error, variables) => invalidate(variables.taskId),
  });
}

export function useDeleteTask(projectId: string) {
  const invalidate = useTaskInvalidation(projectId);
  return useMutation({
    mutationFn: (taskId: string) => api.delete<void>(`/tasks/${taskId}`),
    onSuccess: () => invalidate(),
  });
}

export function useAddComment(projectId: string, taskId: string) {
  const invalidate = useTaskInvalidation(projectId);
  return useMutation({
    mutationFn: (body: string) =>
      api.post<{ comment: Comment }>(`/tasks/${taskId}/comments`, { body }).then((r) => r.comment),
    onSuccess: () => invalidate(taskId),
  });
}

export function useDeleteComment(projectId: string, taskId: string) {
  const invalidate = useTaskInvalidation(projectId);
  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete<void>(`/tasks/${taskId}/comments/${commentId}`),
    onSuccess: () => invalidate(taskId),
  });
}
