"use client";

/**
 * Bodyweight, shown as a trend rather than a reading.
 *
 * Day-to-day weight swings by a kilo or more on water and gut contents alone,
 * so the last number on its own is mostly noise. The card leads with the change
 * across the period and says explicitly that a single day means little — which
 * is the same reasoning that governs the storage-class alert windows elsewhere
 * in this app.
 */

import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { Sparkline } from "@/components/sparkline";
import type { WeightReading } from "@/lib/demo";

export function WeightCard({ readings }: { readings: readonly WeightReading[] }) {
  if (readings.length < 2) {
    return (
      <Card>
        <CardHeader title="Weight" />
        <p className="text-xs text-faint">Not enough readings to show a trend.</p>
      </Card>
    );
  }

  const latest = readings[readings.length - 1];
  const first = readings[0];
  const change = latest.kg - first.kg;
  const days = Math.round(
    (new Date(latest.date).getTime() - new Date(first.date).getTime()) / 86_400_000,
  );

  // Mean of the first and last thirds — less noisy than endpoint-to-endpoint.
  const third = Math.max(1, Math.floor(readings.length / 3));
  const mean = (slice: readonly WeightReading[]) =>
    slice.reduce((sum, r) => sum + r.kg, 0) / slice.length;
  const trend = mean(readings.slice(-third)) - mean(readings.slice(0, third));

  const falling = trend < 0;

  return (
    <Card>
      <CardHeader title="Weight" subtitle={`Last ${days} days`} />

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="hero-figure text-2xl font-semibold text-ink">
            {latest.kg.toFixed(1)}
            <span className="ml-1 text-base font-normal text-muted">kg</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            {falling ? (
              <TrendingDown className="size-3.5" />
            ) : (
              <TrendingUp className="size-3.5" />
            )}
            <span className="numeric">
              {trend > 0 ? "+" : ""}
              {trend.toFixed(1)} kg
            </span>
            trend
          </p>
        </div>

        <Sparkline
          values={readings.map((r) => r.kg)}
          width={110}
          height={34}
          label={`Weight over the last ${days} days`}
        />
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-faint">
        Weight swings by a kilo or more day to day on water alone. The trend across
        weeks is the signal; any single reading, including today&apos;s{" "}
        <span className="numeric">
          {change > 0 ? "+" : ""}
          {change.toFixed(1)} kg
        </span>{" "}
        against the first, is not.
      </p>
    </Card>
  );
}
