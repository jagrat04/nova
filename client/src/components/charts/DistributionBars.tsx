import { classNames } from "../../lib/format";

/**
 * Horizontal magnitude bars. Every row carries its own label and value, so the
 * colour reinforces identity rather than carrying it - which is also what lets the
 * muted Backlog grey stay grey.
 */
export interface DistributionRow {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function DistributionBars({
  rows,
  emptyLabel = "Nothing to show yet.",
  className,
}: {
  rows: DistributionRow[];
  emptyLabel?: string;
  className?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <ul className={classNames("space-y-3", className)}>
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: row.color }}
                aria-hidden
              />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{row.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${(row.value / max) * 100}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Chart colours for the five board stages - validated for CVD separation on white. */
export const STATUS_CHART_COLORS: Record<string, string> = {
  BACKLOG: "#94a3b8",
  TODO: "#0284c7",
  IN_PROGRESS: "#ea580c",
  IN_REVIEW: "#7c3aed",
  DONE: "#059669",
};

export const PRIORITY_CHART_COLORS: Record<string, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#0284c7",
  HIGH: "#ea580c",
  URGENT: "#be123c",
};
