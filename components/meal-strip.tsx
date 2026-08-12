"use client";

/**
 * The day's meals, on the home screen where they belong.
 *
 * Each meal gets a stacked bar of its energy split across the three macro
 * series. Segments are separated by a 2px surface gap rather than a border, and
 * only segments wide enough to hold a label get one — a clipped label inside a
 * narrow segment is worse than no label.
 */

import Link from "next/link";
import { ExpertOnly, useDetailLevel } from "@/components/detail-level";
import { Card, CardHeader } from "@/components/ui";
import { KCAL_PER_GRAM } from "@/lib/nutrition/energy";
import { formatAmount } from "@/lib/nutrition/format";
import type { ResolvedEntry } from "@/lib/demo";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

const SEGMENTS = [
  { id: "protein", label: "P", name: "Protein", bar: "bg-protein" },
  { id: "carbohydrate", label: "C", name: "Carbs", bar: "bg-carb" },
  { id: "fat-total", label: "F", name: "Fat", bar: "bg-fat" },
] as const;

export function MealStrip({
  meals,
  glycemicLoadByMeal,
}: {
  meals: ReadonlyArray<{ meal: string; entries: ResolvedEntry[] }>;
  glycemicLoadByMeal: Readonly<Record<string, number>>;
}) {
  const { detail } = useDetailLevel();

  return (
    <Card>
      <CardHeader
        title="Meals"
        subtitle="Energy and its macronutrient split, meal by meal."
        aside={
          <Link href="/log" className="text-xs text-accent underline-offset-2 hover:underline">
            Open log
          </Link>
        }
      />

      <div className="space-y-4">
        {meals.map(({ meal, entries }) => {
          const grams = Object.fromEntries(
            SEGMENTS.map((segment) => [
              segment.id,
              entries.reduce(
                (sum, entry) => sum + (entry.resolvedNutrients[segment.id] ?? 0),
                0,
              ),
            ]),
          );

          const kcalBySegment = SEGMENTS.map((segment) => ({
            ...segment,
            grams: grams[segment.id],
            kcal: grams[segment.id] * KCAL_PER_GRAM[segment.id],
          }));

          const macroKcal = kcalBySegment.reduce((sum, s) => sum + s.kcal, 0);
          const energy = entries.reduce(
            (sum, entry) => sum + (entry.resolvedNutrients["energy"] ?? 0),
            0,
          );

          return (
            <div key={meal}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm text-ink">
                  {MEAL_LABEL[meal] ?? meal}
                  <span className="ml-2 text-xs text-faint">
                    {new Date(entries[0].loggedAt).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <span className="numeric text-sm text-ink">
                  {formatAmount(energy, "kcal", detail)}
                  <ExpertOnly>
                    <span className="ml-2 text-faint">
                      GL {(glycemicLoadByMeal[meal] ?? 0).toFixed(0)}
                    </span>
                  </ExpertOnly>
                </span>
              </div>

              <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full">
                {kcalBySegment.map((segment) => {
                  const share = macroKcal === 0 ? 0 : (segment.kcal / macroKcal) * 100;
                  if (share === 0) return null;
                  return (
                    <div
                      key={segment.id}
                      title={`${segment.name} ${Math.round(segment.grams)} g`}
                      className={`${segment.bar} first:rounded-l-full last:rounded-r-full`}
                      style={{ width: `${share}%` }}
                    />
                  );
                })}
              </div>

              <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-faint">
                {kcalBySegment.map((segment) => (
                  <span key={segment.id} className="numeric">
                    {segment.name} {Math.round(segment.grams)} g
                  </span>
                ))}
                <span>
                  {entries.length} item{entries.length === 1 ? "" : "s"}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
