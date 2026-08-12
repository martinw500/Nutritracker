/**
 * The roster is the index of everything this app tracks; `nutrients.json` is the
 * subset that has had a reference panel written. This module joins them.
 *
 * A tracked value with `entry: null` is not an error and not a blank — it is a
 * nutrient we track but have not yet documented. The UI renders that state
 * explicitly, which keeps the dashboard honest and doubles as a progress meter
 * for the remaining writing work.
 */

import rosterFile from "@/data/roster.json";
import nutrientsFile from "@/data/nutrients.json";
import type {
  Nutrient,
  NutrientCategory,
  NutrientDatabase,
  StorageClass,
} from "./types";

export type Tier = 1 | 2 | 3;

export interface RosterEntry {
  id: string;
  name: string;
  symbol: string | null;
  unit: string;
  tier: Tier;
  category: NutrientCategory;
  subcategory: string | null;
  storage: StorageClass;
  antioxidantRole: boolean;
  fdcNutrientId: number | null;
  /** Shown on the simple-mode dashboard. Expert mode shows everything. */
  headline: boolean;
}

/** A tracked value, with its reference panel if one has been written. */
export interface TrackedNutrient {
  meta: RosterEntry;
  entry: Nutrient | null;
}

const roster = (rosterFile as { roster: RosterEntry[] }).roster;
const database = nutrientsFile as unknown as NutrientDatabase;

const entriesById = new Map<string, Nutrient>(
  database.nutrients.map((n) => [n.id, n]),
);

const tracked: TrackedNutrient[] = roster.map((meta) => ({
  meta,
  entry: entriesById.get(meta.id) ?? null,
}));

const trackedById = new Map(tracked.map((t) => [t.meta.id, t]));

export function getAllTracked(): TrackedNutrient[] {
  return tracked;
}

export function getTracked(id: string): TrackedNutrient | undefined {
  return trackedById.get(id);
}

export function getByTier(tier: Tier): TrackedNutrient[] {
  return tracked.filter((t) => t.meta.tier === tier);
}

export function getByCategory(category: NutrientCategory): TrackedNutrient[] {
  return tracked.filter((t) => t.meta.category === category);
}

/**
 * Gathers everything with a recognised antioxidant role across Tier 2 and
 * Tier 3. Deliberately returns a list, never a score — see CLAUDE.md rule 4.
 */
export function getAntioxidants(): TrackedNutrient[] {
  return tracked.filter((t) => t.meta.antioxidantRole);
}

export function databaseNotes(): string[] {
  return database.notes;
}

/** How much of the reference layer is written. Surfaced in the UI. */
export function referenceCoverage(): { written: number; total: number } {
  return {
    written: tracked.filter((t) => t.entry !== null).length,
    total: tracked.length,
  };
}
