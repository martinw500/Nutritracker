"use client";

import Link from "next/link";
import { useState } from "react";
import { useDetailLevel } from "@/components/detail-level";
import { PageHeader } from "@/components/page-header";
import { StorageBadge } from "@/components/storage-note";
import { Badge, Card, Note } from "@/components/ui";
import { getAllTracked, referenceCoverage } from "@/lib/nutrition/roster";
import { cn } from "@/lib/utils";

type Filter = "all" | "tier-1" | "tier-2" | "tier-3" | "antioxidant" | "documented" | "todo";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "tier-1", label: "Macronutrients" },
  { id: "tier-2", label: "Micronutrients" },
  { id: "tier-3", label: "Phytonutrients" },
  { id: "antioxidant", label: "Antioxidant role" },
  { id: "documented", label: "Documented" },
  { id: "todo", label: "Not yet written" },
];

export default function NutrientsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { isExpert } = useDetailLevel();
  const tracked = getAllTracked();
  const written = referenceCoverage();

  const visible = tracked.filter((t) => {
    switch (filter) {
      case "tier-1":
        return t.meta.tier === 1;
      case "tier-2":
        return t.meta.tier === 2;
      case "tier-3":
        return t.meta.tier === 3;
      case "antioxidant":
        return t.meta.antioxidantRole;
      case "documented":
        return t.entry !== null;
      case "todo":
        return t.entry === null;
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nutrients"
        subtitle={`Everything this app tracks — ${written.total} values across three tiers. ${written.written} have a written reference panel.`}
      />

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === item.id
                ? "border-transparent bg-ink text-bg"
                : "border-border text-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filter === "antioxidant" ? (
        <Note>
          These are gathered across Tier 2 and Tier 3 by their{" "}
          <code className="text-faint">antioxidantRole</code> flag. They are deliberately
          not combined into a score. USDA withdrew its ORAC database in 2012 because
          such values have no demonstrated relevance to human health, and no composite
          antioxidant number appears anywhere in this app.
        </Note>
      ) : null}

      <Card className="!p-0">
        <ul className="divide-y divide-border">
          {visible.map(({ meta, entry }) => (
            <li key={meta.id}>
              <Link
                href={`/nutrients/${meta.id}`}
                className="flex items-start gap-4 px-5 py-3 transition-colors hover:bg-sunken"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink">{meta.name}</span>
                    {meta.symbol && isExpert ? (
                      <span className="numeric text-xs text-faint">{meta.symbol}</span>
                    ) : null}
                    {entry === null ? (
                      <Badge tone="quiet">no reference yet</Badge>
                    ) : null}
                    {meta.tier === 3 ? <Badge tone="neutral">no target</Badge> : null}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                    {entry
                      ? entry.oneLiner
                      : "Tracked and totalled. Reference panel not written yet."}
                  </p>
                </div>

                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  {isExpert ? <StorageBadge storage={meta.storage} /> : null}
                  <span className="numeric w-10 text-right text-xs text-faint">
                    {meta.unit}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {visible.length === 0 ? <Note>Nothing matches that filter.</Note> : null}
    </div>
  );
}
