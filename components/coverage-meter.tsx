"use client";

/**
 * How much of today's food we actually have phytonutrient data for.
 *
 * This number is usually low and that is the honest state of the world: USDA's
 * flavonoid, isoflavone and proanthocyanidin databases cover about 500 foods
 * between them, against FoodData Central's 600,000. Without this figure a
 * phytonutrient total looks like a measurement when it is really a partial
 * sample, and a user would reasonably read a low number as "I ate none".
 */

import { Card, CardHeader } from "@/components/ui";

export function CoverageMeter({
  covered,
  total,
}: {
  covered: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : (covered / total) * 100;

  return (
    <Card>
      <CardHeader
        title="Phytonutrient data coverage"
        subtitle="What fraction of today's foods appear in USDA's phytonutrient databases."
      />

      <div className="flex items-baseline gap-2">
        <span className="numeric text-2xl text-ink">{Math.round(pct)}%</span>
        <span className="text-xs text-muted">
          {covered} of {total} items
        </span>
      </div>

      <div className="mt-3 flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index < covered ? "bg-accent" : "border border-dashed border-nodata"
            }`}
          />
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        The {total - covered} items without data are not counted as zero anywhere in
        this app. Your real intake of these compounds is higher than the totals below
        — we just cannot say by how much.
      </p>
    </Card>
  );
}
