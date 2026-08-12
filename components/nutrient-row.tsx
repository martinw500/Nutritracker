"use client";

/**
 * ONE row component for every nutrient in the app.
 *
 * There is no NutrientRowSimple and no NutrientRowPhyto. The branching lives
 * here, driven by the `hasTarget()` guard on the data, so a Tier 3 compound
 * physically cannot take the progress-bar path: `TargetBar` accepts only a
 * `ReferenceNutrient`, and the narrowing is what lets it be passed at all.
 *
 * Four states, in the order they are checked:
 *
 *   1. no value logged at all      → "no data", never 0
 *   2. tracked but not documented  → absolute amount, no target, says so
 *   3. Tier 1 or 2                 → amount against the personalised target
 *   4. Tier 3                      → absolute amount and a trend, no percentage
 */

import Link from "next/link";
import { useDetailLevel } from "@/components/detail-level";
import { NoDataChip, PartialDataNote } from "@/components/no-data-chip";
import { Sparkline } from "@/components/sparkline";
import { TargetBar } from "@/components/target-bar";
import { Badge } from "@/components/ui";
import { formatAmount } from "@/lib/nutrition/format";
import type { Person } from "@/lib/nutrition/personalize";
import type { TrackedNutrient } from "@/lib/nutrition/roster";
import { hasTarget } from "@/lib/nutrition/types";

export function NutrientRow({
  tracked,
  amount,
  contributors = 0,
  entryCount = 0,
  person,
  series,
}: {
  tracked: TrackedNutrient;
  /** `undefined` means no logged food carried a value — not zero. */
  amount: number | undefined;
  contributors?: number;
  entryCount?: number;
  person: Person;
  series?: readonly number[];
}) {
  const { detail, isExpert } = useDetailLevel();
  const { meta, entry } = tracked;

  return (
    <div className="grid grid-cols-[minmax(0,11rem)_1fr] items-start gap-4 py-2.5">
      <div className="min-w-0">
        <Link
          href={`/nutrients/${meta.id}`}
          className="text-sm text-ink underline-offset-2 hover:underline"
        >
          {meta.name}
        </Link>
        {isExpert && meta.symbol ? (
          <span className="ml-1.5 text-xs text-faint">{meta.symbol}</span>
        ) : null}
        {entry ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-faint">{entry.oneLiner}</p>
        ) : null}
      </div>

      <div className="min-w-0">
        {amount === undefined ? (
          <NoDataChip
            reason={
              meta.tier === 3
                ? "None of today's foods are in USDA's phytonutrient databases"
                : "No logged food carried a value for this nutrient"
            }
          />
        ) : entry === null ? (
          <UndocumentedValue amount={amount} unit={meta.unit} />
        ) : hasTarget(entry) ? (
          <TargetBar
            nutrient={entry}
            unit={meta.unit}
            amount={amount}
            person={person}
          />
        ) : (
          // Tier 3. No bar, no percentage, no target — there is nothing to be a
          // percentage of. CLAUDE.md rule 3.
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="numeric text-sm text-ink">
                {formatAmount(amount, meta.unit, detail)}
              </span>
              {series && series.length > 1 ? (
                <Sparkline values={series} label={`${meta.name} over the last week`} />
              ) : null}
            </div>
            <p className="text-[11px] leading-relaxed text-faint">
              No reference intake exists. Typical intake is{" "}
              {formatAmount(
                entry.intakeContext.populationMedian.value,
                entry.intakeContext.populationMedian.unit,
                detail,
              )}
              {entry.intakeContext.studiedRange
                ? `; studies use ${entry.intakeContext.studiedRange.low}–${entry.intakeContext.studiedRange.high} ${entry.intakeContext.studiedRange.unit}`
                : ""}
              .
            </p>
          </div>
        )}

        {amount !== undefined && entryCount > 0 ? (
          <div className="mt-1">
            <PartialDataNote contributors={contributors} entryCount={entryCount} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * We track this value and can total it, but nobody has written its reference
 * panel yet — so there is no target to compare against and we say that rather
 * than leaving an empty bar.
 */
function UndocumentedValue({ amount, unit }: { amount: number; unit: string }) {
  const { detail } = useDetailLevel();
  return (
    <div className="flex items-center gap-2">
      <span className="numeric text-sm text-ink">{formatAmount(amount, unit, detail)}</span>
      <Badge tone="quiet" title="This nutrient is tracked, but its reference panel has not been written yet, so there is no target to compare against.">
        no reference yet
      </Badge>
    </div>
  );
}
