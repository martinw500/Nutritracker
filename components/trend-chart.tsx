"use client";

/**
 * The two chart forms this app uses. Both take one series, so neither carries a
 * legend — the card title names it — and both draw the target as a threshold
 * line only when a target actually exists. Tier 3 passes no `target` and gets
 * no line, because there is nothing to draw one at.
 *
 * Gridlines are solid hairlines. The only dashed rule on either chart is the
 * threshold, where dashing carries meaning.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/nutrition/format";

const TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--ink)",
  boxShadow: "var(--shadow-card)",
} as const;

export function TrendChart({
  data,
  unit,
  target,
  targetLabel,
  height = 192,
}: {
  data: ReadonlyArray<{ date: string; value: number }>;
  unit: string;
  target?: number;
  targetLabel?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...data]} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis tickLine={false} axisLine={false} width={44} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
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
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Daily columns. Emphasis, not categorical: today is the accent, the rest
 * recede — the story is "where does today sit", not "tell these seven days
 * apart".
 */
export function DayColumns({
  data,
  unit,
  target,
  targetLabel,
  height = 150,
  highlightLast = true,
}: {
  data: ReadonlyArray<{ date: string; value: number }>;
  unit: string;
  target?: number;
  targetLabel?: string;
  height?: number;
  highlightLast?: boolean;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...data]} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tickLine={false}
            axisLine={false}
            minTickGap={8}
          />
          <YAxis tickLine={false} axisLine={false} width={44} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "var(--surface-sunken)" }}
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
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell
                key={entry.date}
                fill={
                  highlightLast && index === data.length - 1
                    ? "var(--accent)"
                    : "var(--border-strong)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
