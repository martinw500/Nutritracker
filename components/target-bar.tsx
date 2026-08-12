"use client";

/**
 * A progress bar against a personalised reference intake.
 *
 * `nutrient` is typed `ReferenceNutrient`, not `Nutrient`. Passing a
 * phytonutrient is therefore a COMPILE error rather than something a reviewer
 * has to notice. That is CLAUDE.md rule 3 enforced by the type system: Tier 3
 * has no target, so it cannot reach this component at all.
 */

import { useDetailLevel } from "@/components/detail-level";
import { formatAmount, formatPercent } from "@/lib/nutrition/format";
import type { Person } from "@/lib/nutrition/personalize";
import { computeStatus, type StatusBand } from "@/lib/nutrition/status";
import type { ReferenceNutrient } from "@/lib/nutrition/types";
import { cn } from "@/lib/utils";

const BAR_TONE: Record<StatusBand, string> = {
  low: "bg-low",
  "below-target": "bg-below",
  met: "bg-met",
  "over-ul": "bg-over",
};

const BAND_LABEL: Record<StatusBand, string> = {
  low: "Low",
  "below-target": "Under target",
  met: "Target met",
  "over-ul": "Over upper limit",
};

export function TargetBar({
  nutrient,
  unit,
  amount,
  person,
}: {
  nutrient: ReferenceNutrient;
  unit: string;
  amount: number;
  person: Person;
}) {
  const { detail, isExpert } = useDetailLevel();
  const status = computeStatus(nutrient, amount, person);

  if (status.pct === null) {
    return (
      <div className="text-xs text-faint">
        <span className="numeric text-ink">{formatAmount(amount, unit, detail)}</span>
        <span className="ml-2">no reference intake published for this age</span>
      </div>
    );
  }

  // The bar is capped at 100% of its own width; the number carries the overflow.
  const fill = Math.min(status.pct, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="numeric text-ink">
          {formatAmount(amount, unit, detail)}
          <span className="text-faint">
            {" / "}
            {formatAmount(status.target ?? 0, unit, detail)}
          </span>
        </span>
        <span className={cn("numeric font-medium", toneText(status.band))}>
          {formatPercent(status.pct, detail)}
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={Math.round(status.pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${formatPercent(status.pct, detail)} of ${status.targetKind?.toUpperCase()}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
      >
        <div
          className={cn("h-full rounded-full transition-[width]", BAR_TONE[status.band])}
          style={{ width: `${fill}%` }}
        />
      </div>

      {status.ulNotApplicable ? (
        <p className="text-[11px] leading-relaxed text-faint">
          Above the {formatAmount(status.ul ?? 0, unit, detail)} upper limit, but that
          limit applies to {status.ulAppliesTo === "supplemental" ? "supplements" : "fortified foods and supplements"} only
          — not to intake from food. Not flagged.
        </p>
      ) : null}

      {isExpert ? (
        <p className="numeric text-[11px] text-faint">
          {BAND_LABEL[status.band]} · {status.targetKind?.toUpperCase()}{" "}
          {formatAmount(status.target ?? 0, unit, "expert")} · {status.lifeStageKey}
          {status.ul !== null
            ? ` · UL ${formatAmount(status.ul, unit, "expert")} (${status.ulAppliesTo})`
            : " · no UL established"}
        </p>
      ) : null}
    </div>
  );
}

function toneText(band: StatusBand): string {
  switch (band) {
    case "low":
      return "text-low";
    case "below-target":
      return "text-muted";
    case "met":
      return "text-met";
    case "over-ul":
      return "text-over";
  }
}
