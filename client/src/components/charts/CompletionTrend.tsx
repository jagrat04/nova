import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";

/**
 * Tasks completed per day. Counts of discrete events are bars, not a smoothed
 * area - a line between daily counts would imply values that never existed.
 * One series, so the card title names it and no legend is needed.
 */
export function CompletionTrend({ data }: { data: { date: string; completed: number }[] }) {
  const total = data.reduce((sum, point) => sum + point.completed, 0);

  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
        No tasks completed in this window yet.
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          {/* Recessive grid: horizontal only, so bars stay the loudest thing on the card. */}
          <CartesianGrid vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => format(parseISO(value), "d MMM")}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-pop">
                  <p className="text-xs text-slate-500">
                    {format(parseISO(String(label)), "EEEE d MMM")}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {payload[0].value} completed
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="completed" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
