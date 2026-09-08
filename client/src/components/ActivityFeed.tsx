import {
  CheckCircle2,
  FolderPlus,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { timeAgo } from "../lib/format";
import type { Activity } from "../lib/types";
import { Avatar } from "./ui/Avatar";

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  "project.created": { icon: FolderPlus, tone: "bg-brand-50 text-brand-600" },
  "project.updated": { icon: Settings, tone: "bg-slate-100 text-slate-500" },
  "task.created": { icon: Plus, tone: "bg-sky-50 text-sky-600" },
  "task.status_changed": { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
  "task.assigned": { icon: UserPlus, tone: "bg-violet-50 text-violet-600" },
  "task.updated": { icon: Settings, tone: "bg-slate-100 text-slate-500" },
  "task.deleted": { icon: Trash2, tone: "bg-rose-50 text-rose-600" },
  "comment.created": { icon: MessageSquare, tone: "bg-amber-50 text-amber-600" },
  "member.added": { icon: UserPlus, tone: "bg-violet-50 text-violet-600" },
  "member.invited": { icon: UserPlus, tone: "bg-violet-50 text-violet-600" },
  "member.joined": { icon: UserPlus, tone: "bg-violet-50 text-violet-600" },
  "member.removed": { icon: Trash2, tone: "bg-rose-50 text-rose-600" },
  "member.left": { icon: Trash2, tone: "bg-rose-50 text-rose-600" },
  "member.role_changed": { icon: Settings, tone: "bg-slate-100 text-slate-500" },
};

const FALLBACK = { icon: Settings, tone: "bg-slate-100 text-slate-500" };

export function ActivityFeed({
  activities,
  showProject = false,
  emptyLabel = "No activity yet.",
}: {
  activities: Activity[];
  showProject?: boolean;
  emptyLabel?: string;
}) {
  if (activities.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-4">
      {activities.map((activity) => {
        const { icon: Icon, tone } = ICONS[activity.action] ?? FALLBACK;
        return (
          <li key={activity.id} className="flex gap-3">
            <span className="relative">
              <Avatar user={activity.actor} size="sm" />
              <span
                className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white ${tone}`}
              >
                <Icon className="h-2.5 w-2.5" />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">{activity.actor.name}</span>{" "}
                {activity.summary}
                {showProject && activity.project && (
                  <span className="text-slate-500"> in {activity.project.name}</span>
                )}
              </p>
              <p className="text-xs text-slate-400">{timeAgo(activity.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
