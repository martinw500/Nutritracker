/**
 * Estimated energy need.
 *
 * Energy is the one headline figure with no reference intake to look up. There
 * is no RDA for calories and there cannot be one: the requirement depends on
 * body size, composition, age and activity, so the DRI framework publishes an
 * Estimated Energy Requirement — an equation — rather than a table.
 *
 * That is why this lives in code while every other target lives in
 * `data/nutrients.json`. CLAUDE.md rule 1 bans hardcoded *nutrient values*;
 * a published metabolic equation is not a composition value, and there is no
 * table it could be read out of. The coefficients below are the equation as
 * published, cited, and unchanged. See docs/DECISIONS.md (D13).
 *
 * Two honesty obligations follow, and both are enforced in the UI:
 *
 *   1. It is labelled "estimated need", never "RDA" or "target".
 *   2. The uncertainty is shown. Mifflin-St Jeor predicts measured resting
 *      energy expenditure within 10% for roughly 80% of people — so it is
 *      wrong by more than 10% for about one person in five, and the activity
 *      multiplier is a coarser approximation still.
 *
 * Sources:
 *   Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy
 *   expenditure in healthy individuals. Am J Clin Nutr 1990;51(2):241–7.
 *   https://pubmed.ncbi.nlm.nih.gov/2305711/
 *
 *   Frankenfield D, Roth-Yousey L, Compher C. Comparison of predictive
 *   equations for resting metabolic rate in healthy nonobese and obese adults.
 *   J Am Diet Assoc 2005;105(5):775–89.
 *   https://pubmed.ncbi.nlm.nih.gov/15883556/
 */

import type { Sex } from "./personalize";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very-active";

/**
 * Physical activity multipliers applied to resting energy expenditure.
 * Conventional values from the same literature; coarser than the BMR equation
 * and the larger source of error in the final figure.
 */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  "very-active": 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Desk work, little deliberate exercise",
  light: "Light exercise 1–3 days a week",
  moderate: "Moderate exercise 3–5 days a week",
  active: "Hard exercise 6–7 days a week",
  "very-active": "Physical job, or twice-daily training",
};

export interface EnergyInputs {
  sex: Sex;
  ageYears: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
}

export interface EnergyEstimate {
  /** Resting energy expenditure, kcal/day. */
  bmr: number;
  /** BMR × activity factor, kcal/day. This is the figure shown. */
  estimatedNeed: number;
  activityFactor: number;
  /** ±10% band. Shown so the number is never read as exact. */
  range: { low: number; high: number };
  equation: string;
}

/**
 * Mifflin-St Jeor:
 *   male:   10·kg + 6.25·cm − 5·age + 5
 *   female: 10·kg + 6.25·cm − 5·age − 161
 *
 * Chosen over Harris-Benedict because Frankenfield's systematic comparison
 * found it the most accurate of the common equations in both non-obese and
 * obese adults.
 */
export function basalMetabolicRate({
  sex,
  ageYears,
  weightKg,
  heightCm,
}: Omit<EnergyInputs, "activityLevel">): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "male" ? base + 5 : base - 161;
}

export function estimateEnergyNeed(inputs: EnergyInputs): EnergyEstimate {
  const bmr = basalMetabolicRate(inputs);
  const activityFactor = ACTIVITY_FACTORS[inputs.activityLevel];
  const estimatedNeed = bmr * activityFactor;

  return {
    bmr,
    estimatedNeed,
    activityFactor,
    range: { low: estimatedNeed * 0.9, high: estimatedNeed * 1.1 },
    equation: `Mifflin-St Jeor × ${activityFactor} activity factor`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Macronutrient ranges
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Energy yield per gram. Atwater factors — physical constants, not intakes.
 * Present for every value whose reference is a percentage of energy, since
 * that is what turns the percentage into grams.
 */
export const KCAL_PER_GRAM: Record<string, number> = {
  protein: 4,
  carbohydrate: 4,
  "sugars-added": 4,
  "fat-total": 9,
  "fat-saturated": 9,
};

export interface MacroRange {
  /** Grams at the low end of the AMDR, for this energy need. */
  lowGrams: number;
  highGrams: number;
  lowPct: number;
  highPct: number;
}

/**
 * Converts an AMDR — published as a percentage of total energy — into grams for
 * a given energy need.
 *
 * The result is a BAND, and the UI renders it as one. Collapsing it to a single
 * number would invent a precision the reference does not have: there is no
 * "correct" gram figure for fat, only a range the evidence supports.
 */
export function macroRangeGrams(
  nutrientId: string,
  amdr: { lowPct: number; highPct: number },
  energyKcal: number,
): MacroRange | null {
  const kcalPerGram = KCAL_PER_GRAM[nutrientId];
  if (kcalPerGram === undefined) return null;

  return {
    lowGrams: (energyKcal * (amdr.lowPct / 100)) / kcalPerGram,
    highGrams: (energyKcal * (amdr.highPct / 100)) / kcalPerGram,
    lowPct: amdr.lowPct,
    highPct: amdr.highPct,
  };
}

/** What share of the day's energy actually came from this macronutrient. */
export function percentOfEnergy(
  nutrientId: string,
  grams: number,
  energyKcal: number,
): number | null {
  const kcalPerGram = KCAL_PER_GRAM[nutrientId];
  if (kcalPerGram === undefined || energyKcal === 0) return null;
  return ((grams * kcalPerGram) / energyKcal) * 100;
}
