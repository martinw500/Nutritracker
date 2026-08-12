/**
 * Turning an amount into a status band against a personalised reference intake.
 *
 * Two rules are enforced structurally here rather than by convention:
 *
 *  1. The input type is `ReferenceNutrient`, so a phytonutrient cannot be
 *     passed in at all. There is no runtime check to forget — CLAUDE.md rule 3
 *     is a compile error.
 *  2. A UL that `appliesTo` supplements only never produces an excess band.
 *     Dietary magnesium has no upper limit; flagging a 490 mg day against the
 *     350 mg supplemental ceiling would be a false alarm on almost every good
 *     day of eating.
 */

import { resolveReference, type Person } from "./personalize";
import type { ReferenceNutrient } from "./types";

export type StatusBand =
  /** Below 70% of target — the threshold a deficiency streak is built from. */
  | "low"
  /** 70–99% of target. Short, not alarming. */
  | "below-target"
  /** At or above target, and not over an applicable upper limit. */
  | "met"
  /** Above a Tolerable Upper Intake Level that applies to total intake. */
  | "over-ul";

export const LOW_THRESHOLD_PCT = 70;

export interface NutrientStatus {
  band: StatusBand;
  /** Percent of target. Null when no reference covers this person's life stage. */
  pct: number | null;
  target: number | null;
  /** Which reference the target came from — the RDA where one exists, else the AI. */
  targetKind: "rda" | "ai" | null;
  /** The life-stage key matched, so expert mode can show its working. */
  lifeStageKey: string | null;
  ul: number | null;
  ulAppliesTo: "total" | "supplemental" | "fortified-and-supplemental" | null;
  /**
   * True when intake exceeds the UL but the UL does not apply to food, so no
   * excess is reported. The UI states this rather than staying silent, because
   * "why isn't this flagged?" is a fair question.
   */
  ulNotApplicable: boolean;
}

export function computeStatus(
  nutrient: ReferenceNutrient,
  amount: number,
  person: Person,
): NutrientStatus {
  const rda = resolveReference(nutrient.reference.rda, person);
  const ai = rda ? null : resolveReference(nutrient.reference.ai, person);
  const resolved = rda ?? ai;

  const ulSpec = nutrient.reference.ul;
  const ulOverride = ulSpec?.byLifeStage
    ? resolveReference(ulSpec.byLifeStage, person)
    : null;
  const ul = ulSpec ? (ulOverride?.value ?? ulSpec.value) : null;
  const ulAppliesTo = ulSpec?.appliesTo ?? null;

  const overUl = ul !== null && amount > ul;
  const ulCountsFood = ulAppliesTo === "total";

  if (!resolved) {
    return {
      band: "met",
      pct: null,
      target: null,
      targetKind: null,
      lifeStageKey: null,
      ul,
      ulAppliesTo,
      ulNotApplicable: overUl && !ulCountsFood,
    };
  }

  const pct = (amount / resolved.value) * 100;

  let band: StatusBand;
  if (overUl && ulCountsFood) band = "over-ul";
  else if (pct < LOW_THRESHOLD_PCT) band = "low";
  else if (pct < 100) band = "below-target";
  else band = "met";

  return {
    band,
    pct,
    target: resolved.value,
    targetKind: rda ? "rda" : "ai",
    lifeStageKey: resolved.key,
    ul,
    ulAppliesTo,
    ulNotApplicable: overUl && !ulCountsFood,
  };
}

/** Alert window in days, from the nutrient's storage class. CLAUDE.md rule 7. */
export function alertWindowDays(storage: "none" | "moderate" | "high"): number {
  switch (storage) {
    case "none":
      return 3;
    case "moderate":
      return 7;
    case "high":
      return 30;
  }
}

export function alertWindowLabel(storage: "none" | "moderate" | "high"): string {
  switch (storage) {
    case "none":
      return "not stored — assessed over 3 days";
    case "moderate":
      return "days to weeks of reserve — assessed over 7 days";
    case "high":
      return "months to years of reserve — assessed over 30 days";
  }
}
