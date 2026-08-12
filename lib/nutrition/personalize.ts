/**
 * Selecting the right reference value for a given person.
 *
 * DRI tables are not banded consistently. Magnesium publishes 19–30 / 31–50 /
 * 51+; vitamin D publishes 19–50 / 51–70 / 71+; folate publishes 19+. So there
 * is no single life-stage key that works across nutrients, and hardcoding one
 * would silently read the wrong column.
 *
 * Instead we parse the keys present in each table and pick the NARROWEST band
 * that contains this person. That is correct for every banding scheme in the
 * data, including ones not yet written.
 */

import type { ReferenceTable } from "./types";

export type Sex = "male" | "female";
export type PregnancyStatus = "none" | "pregnant" | "lactating";

export interface Person {
  sex: Sex;
  ageYears: number;
  pregnancyStatus: PregnancyStatus;
}

export interface ResolvedReference {
  /** The life-stage key that was matched, so expert mode can show its working. */
  key: string;
  value: number;
}

/** `male_19_30` → `{ group: "male", low: 19, high: 30 }`; `plus` → Infinity. */
interface ParsedKey {
  group: string;
  low: number;
  high: number;
}

const KEY_PATTERN = /^([a-z]+)_(\d+)_(\d+|plus)$/;

export function parseLifeStageKey(key: string): ParsedKey | null {
  const match = KEY_PATTERN.exec(key);
  if (!match) return null;
  return {
    group: match[1],
    low: Number(match[2]),
    high: match[3] === "plus" ? Number.POSITIVE_INFINITY : Number(match[3]),
  };
}

/**
 * Groups to consider, most specific first.
 *
 * Pregnancy and lactation override sex entirely — that is how the DRI tables
 * are published. Below age 9 the tables are sex-neutral, so only `child`
 * applies; from 9 upward a nutrient may band as either `child_9_13` or
 * `male_9_13`, so both are candidates.
 */
export function candidateGroups(person: Person): string[] {
  if (person.pregnancyStatus === "pregnant") return ["pregnancy"];
  if (person.pregnancyStatus === "lactating") return ["lactation"];
  if (person.ageYears < 9) return ["child"];
  return [person.sex, "child"];
}

/**
 * Picks the value for this person out of a life-stage-keyed table.
 *
 * Returns null when the table has no band covering them — which is a real
 * outcome, not a failure. Infant groups are deliberately absent from the data,
 * so under-1 resolves to null and the UI shows "no reference for this age".
 */
export function resolveReference(
  table: ReferenceTable | null | undefined,
  person: Person,
): ResolvedReference | null {
  if (!table) return null;

  const groups = candidateGroups(person);
  let best: { key: string; value: number; span: number; rank: number } | null =
    null;

  for (const [key, value] of Object.entries(table)) {
    if (value === undefined) continue;

    const parsed = parseLifeStageKey(key);
    if (!parsed) continue;

    const rank = groups.indexOf(parsed.group);
    if (rank === -1) continue;
    if (person.ageYears < parsed.low || person.ageYears > parsed.high) continue;

    const span = parsed.high - parsed.low;

    // Prefer the more specific group, then the narrower band. A sex-specific
    // 19–30 beats a sex-neutral 9–13 overlap, and 19–30 beats 19+.
    const better =
      best === null || rank < best.rank || (rank === best.rank && span < best.span);

    if (better) best = { key, value, span, rank };
  }

  return best ? { key: best.key, value: best.value } : null;
}

export function ageFromBirthDate(birthDate: string, on: Date = new Date()): number {
  const born = new Date(birthDate);
  let age = on.getFullYear() - born.getFullYear();
  const monthDelta = on.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && on.getDate() < born.getDate())) age -= 1;
  return age;
}
