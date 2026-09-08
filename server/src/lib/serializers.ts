/** Field selections reused across routes so responses stay consistent. */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  title: true,
  avatarColor: true,
} as const;

export const taskInclude = {
  assignee: { select: publicUserSelect },
  createdBy: { select: publicUserSelect },
  project: { select: { id: true, name: true, key: true, color: true } },
  _count: { select: { comments: true } },
} as const;
