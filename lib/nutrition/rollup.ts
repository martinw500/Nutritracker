/**
 * Daily rollup and streak detection.
 *
 * Kept free of any storage or fixture shape so it can be pointed at the real
 * `log_entries` table later without change.
 */

import { alertWindowDays, LOW_THRESHOLD_PCT } from "./status";
import { sumVectors, type NutrientVector } from "./scale";
import type { StorageClass } from "./types";

export interface LoggedItem {
  /** Tier 1 + 2 amounts, already scaled to the logged quantity. */
  vector: NutrientVector;
  /** Tier 3 amounts. `null` means the food has NO phytonutrient data at all. */
  phyto: NutrientVector | null;
  /** Binomial species, for the plant-diversity count. Null for animal foods. */
  plantSpecies: string | null;
  glycemicLoad: number | null;
  meal: string;
}

export interface DayRollup {
  /** Every tier merged. An absent key means no logged food carried a value. */
  totals: NutrientVector;
  contributors: Readonly<Record<string, number>>;
  entryCount: number;
  /** Distinct plant species eaten. Target is 30 across a week. */
  plantSpecies: string[];
  /** Fraction of entries that had any phytonutrient data. */
  phytoCoverage: number;
  phytoCoveredCount: number;
  glycemicLoad: number;
  glycemicLoadByMeal: Record<string, number>;
}

export function rollUpDay(items: readonly LoggedItem[]): DayRollup {
  const vectors = items.map((item) =>
    item.phyto ? { ...item.vector, ...item.phyto } : item.vector,
  );
  const { totals, contributors } = sumVectors(vectors);

  const species = new Set<string>();
  for (const item of items) {
    if (item.plantSpecies) species.add(item.plantSpecies);
  }

  const glycemicLoadByMeal: Record<string, number> = {};
  let glycemicLoad = 0;
  for (const item of items) {
    if (item.glycemicLoad === null) continue;
    glycemicLoad += item.glycemicLoad;
    glycemicLoadByMeal[item.meal] =
      (glycemicLoadByMeal[item.meal] ?? 0) + item.glycemicLoad;
  }

  const phytoCoveredCount = items.filter((item) => item.phyto !== null).length;

  return {
    totals,
    contributors,
    entryCount: items.length,
    plantSpecies: [...species].sort(),
    phytoCoverage: items.length === 0 ? 0 : phytoCoveredCount / items.length,
    phytoCoveredCount,
    glycemicLoad,
    glycemicLoadByMeal,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaks
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyValue {
  date: string;
  value: number;
}

export interface StreakResult {
  /** Days the assessment covers, from the nutrient's storage class. */
  windowDays: number;
  /** Mean intake across the window. For `none`, this is still reported. */
  windowMean: number;
  pctOfTarget: number;
  /**
   * Consecutive trailing days below the threshold. Only meaningful for
   * unstored nutrients, where a run of days is the signal.
   */
  consecutiveDaysBelow: number;
  firing: boolean;
}

/**
 * Deficiency detection, scaled to how long the body holds a reserve.
 *
 * Unstored nutrients fire on a run of consecutive short days. Stored ones fire
 * on the rolling mean, which is why a single low B12 day is invisible here and
 * a month of them is not. Reading a raw daily value would make both wrong —
 * CLAUDE.md rule 7.
 */
export function detectDeficiency(
  series: readonly DailyValue[],
  target: number,
  storage: StorageClass,
): StreakResult {
  const windowDays = alertWindowDays(storage);
  const window = series.slice(-windowDays);
  const threshold = target * (LOW_THRESHOLD_PCT / 100);

  const windowMean =
    window.length === 0
      ? 0
      : window.reduce((sum, day) => sum + day.value, 0) / window.length;

  let consecutiveDaysBelow = 0;
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (series[i].value < threshold) consecutiveDaysBelow += 1;
    else break;
  }

  const firing =
    storage === "none"
      ? consecutiveDaysBelow >= windowDays
      : window.length > 0 && windowMean < threshold;

  return {
    windowDays,
    windowMean,
    pctOfTarget: target === 0 ? 0 : (windowMean / target) * 100,
    consecutiveDaysBelow,
    firing,
  };
}

/** Simple linear trend across a series, as percent change from first to last. */
export function trendPercent(series: readonly DailyValue[]): number | null {
  if (series.length < 2) return null;
  const half = Math.floor(series.length / 2);
  const mean = (slice: readonly DailyValue[]) =>
    slice.reduce((sum, day) => sum + day.value, 0) / slice.length;
  const earlier = mean(series.slice(0, half));
  const later = mean(series.slice(half));
  if (earlier === 0) return null;
  return ((later - earlier) / earlier) * 100;
}

export function standardDeviation(series: readonly DailyValue[]): number {
  if (series.length < 2) return 0;
  const mean = series.reduce((sum, day) => sum + day.value, 0) / series.length;
  const variance =
    series.reduce((sum, day) => sum + (day.value - mean) ** 2, 0) / (series.length - 1);
  return Math.sqrt(variance);
}
