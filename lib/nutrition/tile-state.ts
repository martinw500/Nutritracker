/**
 * The seven states a tracked value can be in, resolved in one place.
 *
 * Three of them are not statuses at all, and keeping them distinct is the whole
 * point:
 *
 *   no-data      nothing logged carried a value. NOT a zero.
 *   no-reference we track it, but nobody has written its reference panel.
 *   no-target    Tier 3. There is no target, so there is no good or bad.
 *
 * Only the remaining four are statuses, and only they get a status colour.
 * A phytonutrient can never reach one: `computeStatus` accepts only a
 * `ReferenceNutrient`, and the `hasTarget` guard is what narrows to it.
 */

import { macroRangeGrams } from "./energy";
import type { Person } from "./personalize";
import type { TrackedNutrient } from "./roster";
import { computeStatus, type NutrientStatus } from "./status";
import { hasTarget } from "./types";

export type TileState =
  | "no-data"
  | "no-reference"
  | "no-target"
  | "low"
  | "below-target"
  | "met"
  | "over-ul";

/** The four states that carry a status colour. Everything else is neutral. */
export const STATUS_STATES: readonly TileState[] = [
  "low",
  "below-target",
  "met",
  "over-ul",
];

export function isStatusState(state: TileState): boolean {
  return STATUS_STATES.includes(state);
}

export interface TileInfo {
  state: TileState;
  /** Always present, always in words. Colour is never the only channel. */
  label: string;
  status: NutrientStatus | null;
}

const LABEL: Record<TileState, string> = {
  "no-data": "No data",
  "no-reference": "No reference written yet",
  "no-target": "Tracked, no target exists",
  low: "Low",
  "below-target": "Under target",
  met: "Target met",
  "over-ul": "Over upper limit",
};

export interface TileContext {
  /**
   * The day's energy, needed to turn a percent-of-energy AMDR into grams.
   * Without it a macronutrient with only an AMDR cannot be judged at all.
   */
  energyKcal?: number;
  /**
   * Values this day's log genuinely cannot assess, id → reason. They render
   * neutral with the reason in place of a status.
   *
   * This exists because a missing SOURCE is not a shortfall. Water is the case
   * that forces it: the AI is total water including drinks, drinks are not
   * logged as foods, so judging water on food alone would report "low" to
   * someone perfectly well hydrated. A false alarm here costs more than the
   * missing signal — see CLAUDE.md rule 7 for the same reasoning applied to
   * alert windows.
   */
  unassessable?: Readonly<Record<string, string>>;
}

export function resolveTile(
  tracked: TrackedNutrient,
  amount: number | undefined,
  person: Person,
  context: TileContext = {},
): TileInfo {
  const unassessableReason = context.unassessable?.[tracked.meta.id];
  if (unassessableReason !== undefined) {
    return { state: "no-target", label: unassessableReason, status: null };
  }

  if (amount === undefined) {
    return { state: "no-data", label: LABEL["no-data"], status: null };
  }

  const { entry } = tracked;
  if (entry === null) {
    return { state: "no-reference", label: LABEL["no-reference"], status: null };
  }

  if (!hasTarget(entry)) {
    return { state: "no-target", label: LABEL["no-target"], status: null };
  }

  const status = computeStatus(entry, amount, person);

  // Macronutrients carrying an AMDR are judged on the band, not on the RDA.
  // The RDA is a floor — 130 g of carbohydrate keeps the brain supplied — while
  // the band is what the day's composition is actually assessed against. Judging
  // the tile on the RDA while the bar beside it shows the band would put two
  // different verdicts about the same number on one screen.
  const amdr = entry.reference.amdr;
  if (amdr && context.energyKcal) {
    const band = macroRangeGrams(tracked.meta.id, amdr, context.energyKcal);
    if (band) {
      if (amount < band.lowGrams) {
        return { state: "below-target", label: "Below the acceptable range", status };
      }
      if (amount > band.highGrams) {
        return { state: "below-target", label: "Above the acceptable range", status };
      }
      return { state: "met", label: "Within the acceptable range", status };
    }
  }

  // A reference exists but publishes nothing for this life stage — an adult-only
  // table read by a child, say. There is still no target to judge against.
  if (status.pct === null) {
    return { state: "no-target", label: "No reference for this age", status };
  }

  return { state: status.band, label: LABEL[status.band], status };
}

/** Tailwind token names, so a state is styled the same way everywhere. */
export const TILE_TONE: Record<TileState, { fill: string; text: string; soft: string }> = {
  "no-data": { fill: "bg-nodata", text: "text-nodata", soft: "bg-sunken" },
  "no-reference": { fill: "bg-nodata", text: "text-nodata", soft: "bg-sunken" },
  "no-target": { fill: "bg-faint", text: "text-muted", soft: "bg-sunken" },
  low: { fill: "bg-low", text: "text-low", soft: "bg-low-soft" },
  "below-target": { fill: "bg-below", text: "text-below", soft: "bg-below-soft" },
  met: { fill: "bg-met", text: "text-met", soft: "bg-met-soft" },
  "over-ul": { fill: "bg-over", text: "text-over", soft: "bg-over-soft" },
};

/** Ordered worst-first, for the "needs attention" summary. */
export function severityRank(state: TileState): number {
  switch (state) {
    case "over-ul":
      return 0;
    case "low":
      return 1;
    case "below-target":
      return 2;
    default:
      return 3;
  }
}
