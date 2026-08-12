"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NutrientDetail } from "@/components/nutrient-detail";
import { Card } from "@/components/ui";
import { getDayRollup, getPerson } from "@/lib/demo";
import { getTracked } from "@/lib/nutrition/roster";

export default function NutrientPage() {
  const params = useParams<{ id: string }>();
  const tracked = getTracked(params.id);

  return (
    <div className="space-y-6">
      <Link
        href="/nutrients"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        All nutrients
      </Link>

      {tracked === undefined ? (
        <Card>
          <p className="text-sm text-muted">
            <span className="numeric text-ink">{params.id}</span> is not a tracked
            nutrient. The full roster lives in{" "}
            <code className="text-faint">data/roster.json</code>.
          </p>
        </Card>
      ) : (
        <NutrientDetail
          tracked={tracked}
          amount={getDayRollup().totals[tracked.meta.id]}
          person={getPerson()}
        />
      )}
    </div>
  );
}
