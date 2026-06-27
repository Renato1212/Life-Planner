"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Area, AreaScore } from "@/lib/types";
import { format, parseISO } from "@/lib/date";

export function TrendsChart({
  areas,
  scores,
}: {
  areas: Area[];
  scores: AreaScore[];
}) {
  // Group scores by week_start into one row per week.
  const weeks = Array.from(new Set(scores.map((s) => s.week_start))).sort();
  const data = weeks.map((w) => {
    const row: Record<string, number | string> = {
      week: format(parseISO(w), "MMM d"),
    };
    for (const a of areas) {
      const s = scores.find((x) => x.week_start === w && x.area_id === a.id);
      if (s) row[a.name] = s.score;
    }
    return row;
  });

  if (!data.length) {
    return (
      <div className="grid h-48 place-items-center text-center text-[14px] text-ink-3">
        No snapshots yet. Scores are captured each week —
        <br /> simulate a week in Review to see trends here.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fill: "rgb(var(--ink-3))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "rgb(var(--ink-3))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 14,
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--surface))",
              fontSize: 13,
            }}
          />
          {areas.map((a) => (
            <Line
              key={a.id}
              type="monotone"
              dataKey={a.name}
              stroke={a.color}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              isAnimationActive
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
