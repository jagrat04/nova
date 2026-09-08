import { classNames, initials } from "../../lib/format";
import type { User } from "../../lib/types";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

interface AvatarProps {
  user: Pick<User, "name" | "avatarColor"> | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ user, size = "sm", className }: AvatarProps) {
  if (!user) {
    return (
      <span
        title="Unassigned"
        className={classNames(
          "inline-flex items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 font-semibold text-slate-400",
          SIZES[size],
          className,
        )}
      >
        ?
      </span>
    );
  }

  return (
    <span
      title={user.name}
      style={{ backgroundColor: user.avatarColor }}
      className={classNames(
        "inline-flex select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-white",
        SIZES[size],
        className,
      )}
    >
      {initials(user.name)}
    </span>
  );
}

/** Overlapping avatars with a "+N" chip once the list gets long. */
export function AvatarGroup({
  users,
  max = 4,
  size = "sm",
}: {
  users: Pick<User, "id" | "name" | "avatarColor">[];
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = users.slice(0, max);
  const overflow = users.length - shown.length;

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((user) => (
        <Avatar key={user.id} user={user} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className={classNames(
            "inline-flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 ring-2 ring-white",
            SIZES[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
