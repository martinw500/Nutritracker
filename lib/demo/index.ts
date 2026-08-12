/**
 * The ONLY module allowed to import from `data/demo/`.
 *
 * Everything under `data/demo/` is fabricated for the purpose of having
 * something on screen before the database and the FoodData Central mirror
 * exist. Funnelling it through one file means there is exactly one import to
 * delete when real data arrives, and one place to look to answer "is this
 * number real?". See docs/DECISIONS.md (D12).
 */

import dayFile from "@/data/demo/day.json";
import foodsFile from "@/data/demo/foods.json";
import historyFile from "@/data/demo/history.json";
import profileFile from "@/data/demo/profile.json";
import photoDraftFile from "@/data/demo/photo-draft.json";

import { rollUpDay, type DailyValue, type DayRollup, type LoggedItem } from "@/lib/nutrition/rollup";
import { scaleVector, type NutrientVector } from "@/lib/nutrition/scale";
import { ageFromBirthDate, type Person, type PregnancyStatus, type Sex } from "@/lib/nutrition/personalize";
import {
  estimateEnergyNeed,
  type ActivityLevel,
  type EnergyEstimate,
} from "@/lib/nutrition/energy";

export const IS_DEMO_DATA = true;

// ─────────────────────────────────────────────────────────────────────────────
// Shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface DemoFood {
  id: string;
  name: string;
  brand: string | null;
  source: string;
  fdcId: number | null;
  fdcDataType: string;
  plantSpecies: string | null;
  gi: number | null;
  glPer100g: number | null;
  nutrients: NutrientVector;
  /** null means the food has no phytonutrient data — not that it has none. */
  phytonutrients: NutrientVector | null;
}

export type MealName = "breakfast" | "lunch" | "snack" | "dinner";

export interface DemoEntry {
  id: string;
  meal: MealName;
  loggedAt: string;
  foodId: string;
  quantity: number;
  unit: string;
  source: "photo" | "search" | "barcode" | "manual";
  aiConfidence: number | null;
  userEdited: boolean;
}

export interface ResolvedEntry extends DemoEntry {
  food: DemoFood;
  /**
   * The nutrient vector snapshotted at log time. In the real schema this is
   * `log_entries.resolved_nutrients`, denormalised on purpose so that
   * correcting a food record later does not rewrite history.
   */
  resolvedNutrients: NutrientVector;
  resolvedPhytonutrients: NutrientVector | null;
  glycemicLoad: number | null;
}

export interface DemoProfile {
  id: string;
  email: string;
  sex: Sex;
  birthDate: string;
  weightKg: number;
  heightCm: number;
  activityLevel: string;
  pregnancyStatus: PregnancyStatus;
  detailLevel: "simple" | "expert";
  activeGoalMode: string;
}

export interface GoalMode {
  id: string;
  name: string;
  description: string;
  emphasises: string[];
  flags: string[];
  evidenceNote: string;
}

export interface HistoryDay {
  date: string;
  energy: number;
  protein: number;
  fiber: number;
  plantSpecies: number;
  coverage: number;
  entryCount: number;
  [nutrientId: string]: string | number;
}

export interface DraftItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  preparation: string;
  confidence: number;
  portionBasis: string;
  resolvedFoodId: string;
  resolverMethod: string;
  alternatives: string[];
}

export interface PhotoDraft {
  id: string;
  capturedAt: string;
  model: string;
  promptCached: boolean;
  costUsd: number;
  sceneNotes: string;
  items: DraftItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Accessors
// ─────────────────────────────────────────────────────────────────────────────

// Cast through `unknown`: TypeScript infers each food's literal shape from the
// JSON, and the nutrient blocks genuinely differ between foods — that is the
// point, a missing key means no data. The runtime guarantee comes from
// scripts/validate-data.mjs, which checks every key against the roster.
const foods = (foodsFile as unknown as { foods: DemoFood[] }).foods;
const foodsById = new Map(foods.map((food) => [food.id, food]));

export function getFoods(): DemoFood[] {
  return foods;
}

export function getFood(id: string): DemoFood | undefined {
  return foodsById.get(id);
}

export function getProfile(): DemoProfile {
  return (profileFile as { profile: DemoProfile }).profile;
}

export function getGoalModes(): GoalMode[] {
  return (profileFile as unknown as { goalModes: GoalMode[] }).goalModes;
}

export function getActiveGoalMode(): GoalMode {
  const profile = getProfile();
  const modes = getGoalModes();
  return modes.find((mode) => mode.id === profile.activeGoalMode) ?? modes[0];
}

export function getPhotoDraft(): PhotoDraft {
  return (photoDraftFile as { draft: PhotoDraft }).draft;
}

export function getDayDate(): string {
  return (dayFile as { date: string }).date;
}

/** Log entries joined to their food and scaled, mimicking `resolved_nutrients`. */
export function getResolvedEntries(): ResolvedEntry[] {
  const entries = (dayFile as unknown as { entries: DemoEntry[] }).entries;

  return entries.flatMap((entry) => {
    const food = foodsById.get(entry.foodId);
    if (!food) return [];

    const factor = entry.quantity / 100;
    return [
      {
        ...entry,
        food,
        resolvedNutrients: scaleVector(food.nutrients, entry.quantity),
        resolvedPhytonutrients: food.phytonutrients
          ? scaleVector(food.phytonutrients, entry.quantity)
          : null,
        glycemicLoad: food.glPer100g === null ? null : food.glPer100g * factor,
      },
    ];
  });
}

export function getEntriesByMeal(): Array<{ meal: MealName; entries: ResolvedEntry[] }> {
  const order: MealName[] = ["breakfast", "lunch", "snack", "dinner"];
  const resolved = getResolvedEntries();
  return order
    .map((meal) => ({ meal, entries: resolved.filter((e) => e.meal === meal) }))
    .filter((group) => group.entries.length > 0);
}

export function getDayRollup(): DayRollup {
  const items: LoggedItem[] = getResolvedEntries().map((entry) => ({
    vector: entry.resolvedNutrients,
    phyto: entry.resolvedPhytonutrients,
    plantSpecies: entry.food.plantSpecies,
    glycemicLoad: entry.glycemicLoad,
    meal: entry.meal,
  }));
  return rollUpDay(items);
}

/**
 * The day's estimated energy need. Not a reference intake — there isn't one for
 * energy — so it comes from the equation in lib/nutrition/energy.ts and is
 * labelled an estimate everywhere it appears.
 */
export function getEnergyEstimate(): EnergyEstimate {
  const profile = getProfile();
  const person = getPerson();
  return estimateEnergyNeed({
    sex: profile.sex,
    ageYears: person.ageYears,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    activityLevel: profile.activityLevel as ActivityLevel,
  });
}

export interface WeightReading {
  date: string;
  kg: number;
}

export function getWeightSeries(): WeightReading[] {
  return (historyFile as unknown as { weights: WeightReading[] }).weights;
}

export function getPerson(): Person {
  const profile = getProfile();
  return {
    sex: profile.sex,
    ageYears: ageFromBirthDate(profile.birthDate, new Date(`${getDayDate()}T12:00:00`)),
    pregnancyStatus: profile.pregnancyStatus,
  };
}

/**
 * The stored history plus today, where today is COMPUTED from the day fixture
 * rather than stored. That is what stops the trend chart and the dashboard
 * quietly disagreeing about the same day.
 */
export function getHistory(): HistoryDay[] {
  const stored = (historyFile as unknown as { days: HistoryDay[] }).days;
  const rollup = getDayRollup();

  const today: HistoryDay = {
    date: getDayDate(),
    energy: round(rollup.totals["energy"] ?? 0),
    protein: round(rollup.totals["protein"] ?? 0),
    fiber: round(rollup.totals["fiber"] ?? 0),
    "vitamin-c": round(rollup.totals["vitamin-c"] ?? 0),
    "vitamin-d": round(rollup.totals["vitamin-d"] ?? 0),
    magnesium: round(rollup.totals["magnesium"] ?? 0),
    "vitamin-b12": round(rollup.totals["vitamin-b12"] ?? 0),
    "lutein-zeaxanthin": round(rollup.totals["lutein-zeaxanthin"] ?? 0),
    plantSpecies: rollup.plantSpecies.length,
    coverage: Number(rollup.phytoCoverage.toFixed(2)),
    entryCount: rollup.entryCount,
  };

  return [...stored, today];
}

/** History for one nutrient, in the shape the streak and trend helpers want. */
export function getSeries(nutrientId: string): DailyValue[] {
  return getHistory().flatMap((day) => {
    const value = day[nutrientId];
    return typeof value === "number" ? [{ date: day.date, value }] : [];
  });
}

export interface PlantDiversity {
  /** Distinct species eaten today. Real — computed from the logged entries. */
  todaySpecies: string[];
  /** Daily distinct-species counts across the trailing week, for a sparkline. */
  weekCounts: Array<{ date: string; value: number }>;
  target: number;
  /**
   * The weekly figure the target is actually about — distinct species across
   * seven days — cannot be derived from daily counts, because species repeat
   * and summing them would overcount. It needs per-day species lists, which
   * arrive with the real log. Until then the UI shows the daily counts and
   * says the weekly total is not available rather than estimating one.
   */
  weeklyDistinctAvailable: false;
}

export function getPlantDiversity(): PlantDiversity {
  const history = getHistory();
  return {
    todaySpecies: getDayRollup().plantSpecies,
    weekCounts: history
      .slice(-7)
      .map((day) => ({ date: day.date, value: day.plantSpecies })),
    target: 30,
    weeklyDistinctAvailable: false,
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
