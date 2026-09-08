import { format, formatDistanceToNowStrict, isPast, isThisYear, isToday, isTomorrow } from "date-fns";

/** "Today", "Tomorrow", "12 Mar" or "12 Mar 2024" depending on how far away the date is. */
export function formatDueDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, isThisYear(date) ? "d MMM" : "d MMM yyyy");
}

export function formatDate(value: string | Date, pattern = "d MMM yyyy"): string {
  return format(new Date(value), pattern);
}

/** "3 hours ago" — used in comments and the activity feed. */
export function timeAgo(value: string | Date): string {
  return `${formatDistanceToNowStrict(new Date(value))} ago`;
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  return !!dueDate && status !== "DONE" && isPast(new Date(dueDate));
}

/** "Jagrat Singh" -> "JS" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Turns a Date into the yyyy-MM-dd value an <input type="date"> expects. */
export function toDateInput(value: string | null | undefined): string {
  return value ? format(new Date(value), "yyyy-MM-dd") : "";
}

export function classNames(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}
