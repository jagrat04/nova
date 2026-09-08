import { useState } from "react";
import { Copy, Mail, UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { errorMessage } from "../../lib/api";
import { ASSIGNABLE_ROLES, ROLE_META, can } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import {
  useAddMember,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
} from "../../hooks/useMembers";
import type { Role } from "../../lib/types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Badge, ConfirmDialog, ErrorState, PageLoader } from "../ui/Feedback";

export function MembersPanel({ projectId, role }: { projectId: string; role: Role | undefined }) {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useMembers(projectId);
  const addMember = useAddMember(projectId);
  const updateRole = useUpdateMemberRole(projectId);
  const removeMember = useRemoveMember(projectId);
  const revokeInvite = useRevokeInvitation(projectId);

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("MEMBER");
  const [removing, setRemoving] = useState<{ userId: string; name: string } | null>(null);

  const isAdmin = can(role, "ADMIN");

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    try {
      const result = await addMember.mutateAsync({ email: email.trim(), role: inviteRole });
      toast.success(
        result.member
          ? `${result.member.user.name} added to the project`
          : `Invitation created for ${email.trim()}`,
      );
      setEmail("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function handleRemove() {
    if (!removing) return;
    try {
      await removeMember.mutateAsync(removing.userId);
      toast.success(
        removing.userId === user?.id ? "You left the project" : `${removing.name} removed`,
      );
      setRemoving(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (isLoading) return <PageLoader label="Loading members" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      {isAdmin && (
        <form onSubmit={handleAdd} className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[240px] flex-1">
            <label className="label" htmlFor="member-email">
              Add a teammate
            </label>
            <input
              id="member-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="member-role">
              Role
            </label>
            <select
              id="member-role"
              className="input w-auto"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_META[r].label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={addMember.isPending} icon={<UserPlus className="h-4 w-4" />}>
            Add
          </Button>
          <p className="w-full text-xs text-slate-400">
            {ROLE_META[inviteRole].hint}. People without a NOVA account get an invitation that is
            applied when they sign up.
          </p>
        </form>
      )}

      <div className="card divide-y divide-slate-100">
        {data?.members.map(({ user: member, role: memberRole, joinedAt }) => (
          <div key={member.id} className="flex flex-wrap items-center gap-3 p-4">
            <Avatar user={member} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">
                {member.name}
                {member.id === user?.id && <span className="ml-2 text-xs text-slate-400">You</span>}
              </p>
              <p className="truncate text-sm text-slate-500">
                {member.title ? `${member.title} · ` : ""}
                {member.email}
              </p>
            </div>

            <span className="hidden text-xs text-slate-400 sm:block">
              Joined {formatDate(joinedAt)}
            </span>

            {isAdmin && memberRole !== "OWNER" ? (
              <select
                className="input w-auto"
                value={memberRole}
                aria-label={`Role for ${member.name}`}
                onChange={(e) =>
                  updateRole.mutate(
                    { userId: member.id, role: e.target.value as Role },
                    { onError: (err) => toast.error(errorMessage(err)) },
                  )
                }
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_META[r].label}
                  </option>
                ))}
              </select>
            ) : (
              <Badge className={ROLE_META[memberRole].chip}>{ROLE_META[memberRole].label}</Badge>
            )}

            {memberRole !== "OWNER" && (isAdmin || member.id === user?.id) && (
              <button
                onClick={() => setRemoving({ userId: member.id, name: member.name })}
                aria-label={member.id === user?.id ? "Leave project" : `Remove ${member.name}`}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!!data?.invitations.length && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Pending invitations
          </h3>
          <div className="card divide-y divide-slate-100">
            {data.invitations.map((invitation) => (
              <div key={invitation.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Mail className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{invitation.email}</p>
                  <p className="text-sm text-slate-500">
                    Expires {formatDate(invitation.expiresAt)}
                  </p>
                </div>
                <Badge className={ROLE_META[invitation.role].chip}>
                  {ROLE_META[invitation.role].label}
                </Badge>
                {isAdmin && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Copy className="h-3.5 w-3.5" />}
                      onClick={() => {
                        const link = `${location.origin}/register?invite=${invitation.token}`;
                        navigator.clipboard
                          .writeText(link)
                          .then(() => toast.success("Invite link copied"))
                          .catch(() => toast.error("Could not copy the link"));
                      }}
                    >
                      Copy link
                    </Button>
                    <button
                      onClick={() =>
                        revokeInvite.mutate(invitation.id, {
                          onSuccess: () => toast.success("Invitation revoked"),
                          onError: (err) => toast.error(errorMessage(err)),
                        })
                      }
                      aria-label={`Revoke invitation for ${invitation.email}`}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removing}
        title={removing?.userId === user?.id ? "Leave this project?" : `Remove ${removing?.name}?`}
        message={
          removing?.userId === user?.id
            ? "You will lose access to this project's board and tasks."
            : "They lose access immediately. Tasks assigned to them stay in the project, unassigned."
        }
        confirmLabel={removing?.userId === user?.id ? "Leave" : "Remove"}
        loading={removeMember.isPending}
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
