/**
 * Food-level flags — the broader signals a per-nutrient number never captures.
 *
 * Two sources, deliberately kept apart:
 *
 *   declared — properties that cannot be computed from composition. Whether a
 *              meat is cured, a grain whole, a food fermented. These live on
 *              the food record.
 *   derived  — computed here from the food's own numbers. A food cannot end up
 *              tagged "high sodium" while its sodium figure says otherwise,
 *              because the tag IS the figure.
 *
 * Every flag carries an evidence tier and a citation, the same rule that binds
 * `benefits[]` in the nutrient data — `validate:data` enforces both.
 */

import attributesFile from "@/data/food-attributes.json";
import type { Citation, EvidenceTier } from "./types";

export type Polarity = "caution" | "positive";
export type AttributeFamily =
  | "cancer-and-processing"
  | "glycemic"
  | "cardiometabolic"
  | "positive";

export interface FoodAttribute {
  id: string;
  label: string;
  polarity: Polarity;
  family: AttributeFamily;
  source: "declared" | "derived";
  threshold?: string;
  evidence: EvidenceTier;
  oneLiner: string;
  detail: string;
  citations: Citation[];
}

const attributes = (attributesFile as unknown as { attributes: FoodAttribute[] })
  .attributes;

const byId = new Map(attributes.map((a) => [a.id, a]));

export function getAttribute(id: string): FoodAttribute | undefined {
  return byId.get(id);
}

export function getAllAttributes(): FoodAttribute[] {
  return attributes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Derivation thresholds
// ─────────────────────────────────────────────────────────────────────────────

/** GI at or above which a food is flagged. The conventional "high GI" cutoff. */
export const HIGH_GI = 70;

/** Per 100 g. 20% of the 2,300 mg daily figure — the usual "high" labelling rule. */
export const HIGH_SODIUM_PER_100G = 460;

/** Per 100 g, matching front-of-pack "high in saturated fat" conventions. */
export const HIGH_SATURATED_FAT_PER_100G = 5;

/** Glycemic load at or above which a whole MEAL is flagged. */
export const HIGH_MEAL_GL = 20;

/** The shape `resolveFoodAttributes` needs. Kept minimal so it is not tied to the fixtures. */
export interface AttributableFood {
  gi: number | null;
  nutrients: Readonly<Record<string, number>>;
  /** Flags that cannot be computed — cured, fermented, whole grain. */
  attributes?: readonly string[];
}

/**
 * Every flag that applies to a food, declared and derived together.
 *
 * Derived flags read per-100g composition, so they are independent of how much
 * was eaten — "this food is salty", not "you ate a lot of salt". Portion-level
 * judgements belong to the nutrient totals, which already handle them.
 */
export function resolveFoodAttributes(food: AttributableFood): FoodAttribute[] {
  const ids = new Set<string>(food.attributes ?? []);

  if (food.gi !== null && food.gi >= HIGH_GI) ids.add("high-gi");

  const sodium = food.nutrients["sodium"];
  if (sodium !== undefined && sodium >= HIGH_SODIUM_PER_100G) ids.add("high-sodium");

  const saturated = food.nutrients["fat-saturated"];
  if (saturated !== undefined && saturated >= HIGH_SATURATED_FAT_PER_100G) {
    ids.add("high-saturated-fat");
  }

  // A measured zero means "we looked, there is none" — it must not raise a flag.
  const addedSugar = food.nutrients["sugars-added"];
  if (addedSugar !== undefined && addedSugar > 0) ids.add("added-sugar");

  const trans = food.nutrients["fat-trans"];
  if (trans !== undefined && trans > 0) ids.add("trans-fat");

  return [...ids]
    .map((id) => byId.get(id))
    .filter((a): a is FoodAttribute => a !== undefined)
    .sort(byPolarityThenEvidence);
}

/** Meal-level flags, which depend on the portion rather than the food. */
export function resolveMealAttributes(glycemicLoad: number): FoodAttribute[] {
  const out: FoodAttribute[] = [];
  if (glycemicLoad >= HIGH_MEAL_GL) {
    const flag = byId.get("high-gl-meal");
    if (flag) out.push(flag);
  }
  return out;
}

export interface AttributeTally {
  attribute: FoodAttribute;
  /** Which logged foods raised it, for "why am I seeing this?". */
  foods: string[];
}

/** Rolls flags up across a day, keeping track of what caused each one. */
export function tallyAttributes(
  entries: ReadonlyArray<{ name: string; food: AttributableFood }>,
): AttributeTally[] {
  const tally = new Map<string, AttributeTally>();

  for (const entry of entries) {
    for (const attribute of resolveFoodAttributes(entry.food)) {
      const existing = tally.get(attribute.id);
      if (existing) existing.foods.push(entry.name);
      else tally.set(attribute.id, { attribute, foods: [entry.name] });
    }
  }

  return [...tally.values()].sort((a, b) =>
    byPolarityThenEvidence(a.attribute, b.attribute),
  );
}

const EVIDENCE_ORDER: Record<EvidenceTier, number> = {
  strong: 0,
  moderate: 1,
  limited: 2,
  preliminary: 3,
};

/** Cautions first, strongest evidence first within each. */
function byPolarityThenEvidence(a: FoodAttribute, b: FoodAttribute): number {
  if (a.polarity !== b.polarity) return a.polarity === "caution" ? -1 : 1;
  return EVIDENCE_ORDER[a.evidence] - EVIDENCE_ORDER[b.evidence];
}
