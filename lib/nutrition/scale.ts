/**
 * Scaling and summing nutrient vectors.
 *
 * The invariant that matters here: an ABSENT key means "we have no data for
 * this nutrient in this food", and it must stay absent all the way through
 * scaling and summation. A present `0` means "measured, and it is zero".
 * Collapsing the two produces charts that are alarming and wrong — CLAUDE.md
 * rule 5.
 */

/** Per-100g or per-serving amounts, keyed by nutrient id. Absent = no data. */
export type NutrientVector = Readonly<Record<string, number>>;

export interface SummedVector {
  totals: NutrientVector;
  /**
   * How many of the summed vectors actually carried a value for each nutrient.
   * A total of 4.2 mg built from 2 of 11 foods is a very different claim from
   * one built from 11 of 11, and the UI says which.
   */
  contributors: Readonly<Record<string, number>>;
  /** Number of vectors summed, so `contributors` has a denominator. */
  vectorCount: number;
}

/** Scales a per-100g vector to an actual quantity in grams. */
export function scaleVector(per100g: NutrientVector, grams: number): NutrientVector {
  const factor = grams / 100;
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(per100g)) {
    out[id] = value * factor;
  }
  return out;
}

export function sumVectors(vectors: readonly NutrientVector[]): SummedVector {
  const totals: Record<string, number> = {};
  const contributors: Record<string, number> = {};

  for (const vector of vectors) {
    for (const [id, value] of Object.entries(vector)) {
      totals[id] = (totals[id] ?? 0) + value;
      contributors[id] = (contributors[id] ?? 0) + 1;
    }
  }

  return { totals, contributors, vectorCount: vectors.length };
}

/** True when we have no data at all, as opposed to a measured zero. */
export function isMissing(vector: NutrientVector, id: string): boolean {
  return vector[id] === undefined;
}

/**
 * Fraction of vectors that carried any value for the given nutrient ids.
 *
 * Used for the per-day phytonutrient coverage figure: with USDA's flavonoid
 * databases covering ~500 foods against FoodData Central's 600,000, most days
 * will sit well under 100%, and saying so is the point.
 */
export function coverage(
  vectors: readonly NutrientVector[],
  ids: readonly string[],
): number {
  if (vectors.length === 0) return 0;
  const covered = vectors.filter((v) => ids.some((id) => v[id] !== undefined));
  return covered.length / vectors.length;
}
