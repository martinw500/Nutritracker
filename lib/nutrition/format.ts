/**
 * Display formatting. Simple mode rounds; expert mode does not.
 *
 * This is the only place rounding happens. Rounding at the point of calculation
 * would compound through daily rollups and rolling averages.
 */

import type { EvidenceTier } from "./types";

export type DetailLevel = "simple" | "expert";

/**
 * Rounds by magnitude rather than to a fixed number of decimals: 1721 kcal
 * wants no decimals, 0.42 mg wants two, and one rule that produces both reads
 * better than a per-nutrient table.
 */
export function formatAmount(
  value: number,
  unit: string,
  detail: DetailLevel = "simple",
): string {
  if (!Number.isFinite(value)) return "—";

  if (detail === "expert") {
    const decimals = value >= 100 ? 1 : value >= 1 ? 2 : 3;
    return `${trimZeros(value.toFixed(decimals))} ${unit}`;
  }

  const rounded =
    value >= 100 ? Math.round(value) : value >= 10 ? round(value, 1) : round(value, 2);
  return `${trimZeros(String(rounded))} ${unit}`;
}

export function formatPercent(pct: number | null, detail: DetailLevel = "simple"): string {
  if (pct === null) return "—";
  return detail === "expert" ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function trimZeros(text: string): string {
  return text.includes(".") ? text.replace(/\.?0+$/, "") : text;
}

/**
 * Evidence tier collapsed into hedging for simple mode — CLAUDE.md rule 2.
 * Only `strong` gets an unqualified verb.
 */
export function hedge(claim: string, evidence: EvidenceTier): string {
  const lowered = claim.charAt(0).toLowerCase() + claim.slice(1);
  switch (evidence) {
    case "strong":
      return claim;
    case "moderate":
      return `May ${lowered}`;
    case "limited":
      return `May ${lowered}, though the evidence is thin`;
    case "preliminary":
      return `Has been associated with: ${lowered}`;
  }
}

export const EVIDENCE_LABEL: Record<EvidenceTier, string> = {
  strong: "Strong",
  moderate: "Moderate",
  limited: "Limited",
  preliminary: "Preliminary",
};

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
