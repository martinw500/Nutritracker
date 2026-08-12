"use client";

/**
 * How a health claim is allowed to be phrased.
 *
 * Every `benefits[]` entry carries an evidence tier — the schema rejects ones
 * that do not. In expert mode the tier shows as a badge next to the claim and
 * the reasoning behind it. In simple mode there is no badge, so the tier has to
 * live in the wording instead: only `strong` gets an unqualified verb, and
 * `preliminary` gets "has been associated with". Same data, same claim, honest
 * either way. CLAUDE.md rule 2.
 */

import { Badge } from "@/components/ui";
import { useDetailLevel } from "@/components/detail-level";
import { EVIDENCE_LABEL, hedge } from "@/lib/nutrition/format";
import type { Benefit, EvidenceTier } from "@/lib/nutrition/types";

const TONE: Record<EvidenceTier, "met" | "accent" | "neutral" | "quiet"> = {
  strong: "met",
  moderate: "accent",
  limited: "neutral",
  preliminary: "quiet",
};

export function EvidenceBadge({ evidence }: { evidence: EvidenceTier }) {
  return (
    <Badge tone={TONE[evidence]} title={`Evidence: ${EVIDENCE_LABEL[evidence]}`}>
      {EVIDENCE_LABEL[evidence]}
    </Badge>
  );
}

export function BenefitList({ benefits }: { benefits: readonly Benefit[] }) {
  const { isExpert } = useDetailLevel();

  if (benefits.length === 0) return null;

  return (
    <ul className="space-y-3">
      {benefits.map((benefit) => (
        <li key={benefit.claim} className="border-l-2 border-border pl-3">
          {isExpert ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink">{benefit.claim}</span>
                <EvidenceBadge evidence={benefit.evidence} />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{benefit.note}</p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-ink">
              {hedge(benefit.claim, benefit.evidence)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
