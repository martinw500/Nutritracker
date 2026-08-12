"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/nutrition/format";

export function TrendChart({
  data,
  unit,
  target,
  targetLabel,
}: {
  data: ReadonlyArray<{ date: string; value: number }>;
  unit: string;
  /** Omitted entirely for Tier 3 — there is no target line to draw. */
  target?: number;
  targetLabel?: string;
}) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...data]} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis tickLine={false} axisLine={false} width={44} />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(label) => formatDate(String(label))}
            formatter={(value) => [`${value} ${unit}`, ""] as [string, string]}
          />
          {target !== undefined ? (
            <ReferenceLine
              y={target}
              stroke="var(--met)"
              strokeDasharray="4 4"
              label={{
                value: targetLabel ?? "target",
                position: "insideTopRight",
                fill: "var(--ink-faint)",
                fontSize: 10,
              }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
