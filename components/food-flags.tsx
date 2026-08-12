"use client";

/**
 * Food-level flags on screen.
 *
 * The tone rule this component exists to enforce: a flag never states a
 * conclusion without its size and its uncertainty. "Processed meat is a Group 1
 * carcinogen" alone is technically true and badly misleading — IARC groups
 * describe how confident the evidence is, not how large the risk is. So the
 * chip is short, and the detail behind it always carries the actual number and
 * the actual caveat.
 *
 * Positive flags render identically to cautions. A feature that only ever warns
 * is one people learn to ignore.
 */

import { useState } from "react";
import { ChevronDown, Leaf, TriangleAlert } from "lucide-react";
import { EvidenceBadge } from "@/components/evidence-badge";
import { useDetailLevel } from "@/components/detail-level";
import { Card, CardHeader } from "@/components/ui";
import type { AttributeTally, FoodAttribute } from "@/lib/nutrition/attributes";
import { cn } from "@/lib/utils";

/**
 * Presentational only — a `<span>`, never a `<button>`.
 *
 * It is rendered inside the expander button in `FoodFlagsCard`, and a button
 * inside a button is invalid HTML: the browser closes the outer one early, so
 * the server and client trees disagree and hydration fails. Whatever wraps a
 * chip owns the interaction; the chip is a label.
 */
export function FlagChip({ attribute }: { attribute: FoodAttribute }) {
  const caution = attribute.polarity === "caution";

  return (
    <span
      title={attribute.oneLiner}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        caution
          ? "border-transparent bg-low-soft text-low"
          : "border-transparent bg-met-soft text-met",
      )}
    >
      {caution ? (
        <TriangleAlert className="size-3" strokeWidth={2.25} />
      ) : (
        <Leaf className="size-3" strokeWidth={2.25} />
      )}
      {attribute.label}
    </span>
  );
}

export function FlagChips({
  attributes,
  max = 4,
}: {
  attributes: readonly FoodAttribute[];
  max?: number;
}) {
  if (attributes.length === 0) return null;
  const shown = attributes.slice(0, max);
  const hidden = attributes.length - shown.length;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((attribute) => (
        <FlagChip key={attribute.id} attribute={attribute} />
      ))}
      {hidden > 0 ? <span className="text-[11px] text-faint">+{hidden}</span> : null}
    </span>
  );
}

/**
 * The day's flags, with what caused each and the full reasoning one tap away.
 * Expanding is available at both detail levels — this is exactly the kind of
 * detail that should not require flipping a global switch to reach.
 */
export function FoodFlagsCard({ tallies }: { tallies: readonly AttributeTally[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const { isExpert } = useDetailLevel();

  const cautions = tallies.filter((t) => t.attribute.polarity === "caution");
  const positives = tallies.filter((t) => t.attribute.polarity === "positive");

  return (
    <Card>
      <CardHeader
        title="What you ate, beyond the numbers"
        subtitle="Properties of the foods themselves. Tap any one for the actual figure and how good the evidence is."
      />

      {tallies.length === 0 ? (
        <p className="text-xs text-faint">Nothing flagged in today&apos;s foods.</p>
      ) : (
        <div className="space-y-4">
          {[
            { label: "Worth knowing", items: cautions },
            { label: "Doing well", items: positives },
          ].map((group) =>
            group.items.length === 0 ? null : (
              <div key={group.label}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
                  {group.label}
                </p>
                <ul className="space-y-2">
                  {group.items.map((tally) => (
                    <li key={tally.attribute.id}>
                      <button
                        onClick={() =>
                          setOpen(open === tally.attribute.id ? null : tally.attribute.id)
                        }
                        aria-expanded={open === tally.attribute.id}
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sunken"
                      >
                        <ChevronDown
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0 text-faint transition-transform",
                            open === tally.attribute.id && "rotate-180",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <FlagChip attribute={tally.attribute} />
                            {isExpert ? (
                              <EvidenceBadge evidence={tally.attribute.evidence} />
                            ) : null}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted">
                            {tally.attribute.oneLiner}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-faint">
                            from {tally.foods.join(", ")}
                          </span>
                        </span>
                      </button>

                      {open === tally.attribute.id ? (
                        <div className="ml-7 mt-1 border-l-2 border-border pl-3">
                          <p className="text-xs leading-relaxed text-muted">
                            {tally.attribute.detail}
                          </p>
                          {tally.attribute.threshold ? (
                            <p className="mt-2 text-[11px] text-faint">
                              Flagged at: {tally.attribute.threshold}
                            </p>
                          ) : null}
                          <ul className="mt-2 space-y-1">
                            {tally.attribute.citations.map((citation) => (
                              <li key={citation.url}>
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-accent underline-offset-2 hover:underline"
                                >
                                  {citation.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      )}
    </Card>
  );
}
