"use client";

/**
 * A titled block of nutrient rows.
 *
 * Simple mode shows the headline set; expert mode shows everything the roster
 * tracks. Expert is a strict SUPERSET — the same rows in the same order, with
 * more of them revealed. Nothing moves between modes and nothing is replaced.
 */

import { useDetailLevel } from "@/components/detail-level";
import { NutrientRow } from "@/components/nutrient-row";
import { Card, CardHeader } from "@/components/ui";
import type { Person } from "@/lib/nutrition/personalize";
import type { TrackedNutrient } from "@/lib/nutrition/roster";
import type { DayRollup } from "@/lib/nutrition/rollup";

export function NutrientGroup({
  title,
  subtitle,
  nutrients,
  rollup,
  person,
  seriesFor,
}: {
  title: string;
  subtitle?: string;
  nutrients: readonly TrackedNutrient[];
  rollup: DayRollup;
  person: Person;
  seriesFor?: (id: string) => readonly number[] | undefined;
}) {
  const { isExpert } = useDetailLevel();
  const visible = isExpert ? nutrients : nutrients.filter((n) => n.meta.headline);
  const hiddenCount = nutrients.length - visible.length;

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />

      <div className="divide-y divide-border">
        {visible.map((tracked) => (
          <NutrientRow
            key={tracked.meta.id}
            tracked={tracked}
            amount={rollup.totals[tracked.meta.id]}
            contributors={rollup.contributors[tracked.meta.id] ?? 0}
            entryCount={rollup.entryCount}
            person={person}
            series={seriesFor?.(tracked.meta.id)}
          />
        ))}
      </div>

      {hiddenCount > 0 ? (
        <p className="mt-3 text-[11px] text-faint">
          {hiddenCount} more tracked in expert mode.
        </p>
      ) : null}
    </Card>
  );
}
