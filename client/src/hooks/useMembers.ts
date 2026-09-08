import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { projectKeys } from "./useProjects";
import type { Invitation, ProjectMember, Role, User } from "../lib/types";

export const memberKeys = {
  list: (projectId: string) => ["members", projectId] as const,
};

interface MembersResponse {
  members: ProjectMember[];
  invitations: Invitation[];
}

export function useMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: memberKeys.list(projectId ?? ""),
    queryFn: () => api.get<MembersResponse>(`/projects/${projectId}/members`),
    enabled: !!projectId,
  });
}

/** Typeahead for the "add member" field. Skips very short queries. */
export function useUserSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["users", "search", trimmed],
    queryFn: () => api.get<{ users: User[] }>(`/users/search?q=${encodeURIComponent(trimmed)}`),
    select: (data) => data.users,
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}

function useMemberInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: memberKeys.list(projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.activity(projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
  };
}

export function useAddMember(projectId: string) {
  const invalidate = useMemberInvalidation(projectId);
  return useMutation({
    mutationFn: (input: { email: string; role: Role }) =>
      api.post<{ member?: ProjectMember; invitation?: Invitation }>(
        `/projects/${projectId}/members`,
        input,
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateMemberRole(projectId: string) {
  const invalidate = useMemberInvalidation(projectId);
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      api.patch<{ member: ProjectMember }>(`/projects/${projectId}/members/${userId}`, { role }),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(projectId: string) {
  const invalidate = useMemberInvalidation(projectId);
  return useMutation({
    mutationFn: (userId: string) => api.delete<void>(`/projects/${projectId}/members/${userId}`),
    onSuccess: invalidate,
  });
}

export function useRevokeInvitation(projectId: string) {
  const invalidate = useMemberInvalidation(projectId);
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.delete<void>(`/projects/${projectId}/members/invitations/${invitationId}`),
    onSuccess: invalidate,
  });
}
