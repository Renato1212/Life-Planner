"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  PolarRadiusAxis,
} from "recharts";
import type { Area } from "@/lib/types";

export function LifeWheel({
  areas,
  scores,
}: {
  areas: Area[];
  scores: Record<string, number>;
}) {
  const data = areas.map((a) => ({
    area: a.name,
    score: scores[a.id] ?? 0,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgb(var(--border))" />
          <PolarAngleAxis
            dataKey="area"
            tick={{ fill: "rgb(var(--ink-2))", fontSize: 13, fontWeight: 600 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="score"
            stroke="rgb(var(--tint))"
            strokeWidth={2}
            fill="rgb(var(--tint))"
            fillOpacity={0.25}
            isAnimationActive
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
