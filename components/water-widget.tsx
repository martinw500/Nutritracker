"use client";

/**
 * Water, against its Adequate Intake.
 *
 * Two honesty points the UI has to make, because the numbers look wrong
 * otherwise:
 *
 *   - the AI is TOTAL water, and roughly a fifth of it arrives in food, so the
 *     amount you need to drink is meaningfully less than the headline figure;
 *   - the food contribution here is real, computed from the logged foods'
 *     water content, so the two are shown as separate parts of one bar.
 */

import { useState } from "react";
import { Droplet, Minus, Plus } from "lucide-react";
import { useDetailLevel } from "@/components/detail-level";
import { Card, CardHeader } from "@/components/ui";
import { formatAmount } from "@/lib/nutrition/format";
import { resolveReference, type Person } from "@/lib/nutrition/personalize";
import type { TrackedNutrient } from "@/lib/nutrition/roster";
import { hasTarget } from "@/lib/nutrition/types";

const GLASS_ML = 250;

export function WaterWidget({
  tracked,
  fromFoodMl,
  person,
}: {
  tracked: TrackedNutrient | undefined;
  /** Water contributed by logged foods, from their composition. */
  fromFoodMl: number | undefined;
  person: Person;
}) {
  const [drunkMl, setDrunkMl] = useState(1500);
  const { detail } = useDetailLevel();

  const entry = tracked?.entry;
  const target =
    entry && hasTarget(entry) ? resolveReference(entry.reference.ai, person) : null;

  const food = fromFoodMl ?? 0;
  const total = drunkMl + food;
  const pct = target ? Math.min((total / target.value) * 100, 100) : 0;
  const foodShare = target ? Math.min((food / target.value) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader
        title="Water"
        subtitle={
          target
            ? "Adequate Intake is TOTAL water — about a fifth of it comes from food, so you need to drink less than the headline figure."
            : undefined
        }
      />

      <div className="flex items-baseline gap-2">
        <span className="hero-figure text-2xl font-semibold text-ink">
          {(total / 1000).toFixed(1)} L
        </span>
        {target ? (
          <span className="text-xs text-muted">
            of {formatAmount(target.value / 1000, "L", detail)} total
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-sunken">
        <div
          className="rounded-l-full bg-accent"
          style={{ width: `${Math.max(pct - foodShare, 0)}%` }}
          title={`Drunk ${(drunkMl / 1000).toFixed(2)} L`}
        />
        <div
          className="bg-accent/40"
          style={{ width: `${foodShare}%` }}
          title={`From food ${(food / 1000).toFixed(2)} L`}
        />
      </div>

      <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-faint">
        <span className="numeric">Drunk {(drunkMl / 1000).toFixed(2)} L</span>
        <span className="numeric">From food {(food / 1000).toFixed(2)} L</span>
      </p>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setDrunkMl((ml) => Math.max(0, ml - GLASS_ML))}
          aria-label="Remove a 250 ml glass"
          className="flex size-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <Minus className="size-4" />
        </button>
        <button
          onClick={() => setDrunkMl((ml) => ml + GLASS_ML)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          <Droplet className="size-4" strokeWidth={2} />
          <Plus className="size-3" strokeWidth={3} />
          250 ml
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        No need to hit this exactly. Thirst regulates intake well in healthy adults, and
        pale yellow urine is a better check than any number.
      </p>
    </Card>
  );
}
