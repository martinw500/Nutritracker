"use client";

import Link from "next/link";
import { useState } from "react";
import { ExpertOnly, useDetailLevel } from "@/components/detail-level";
import { PageHeader } from "@/components/page-header";
import { StorageNote } from "@/components/storage-note";
import { TrendChart } from "@/components/trend-chart";
import { Badge, Card, CardHeader, DefinitionList, Note } from "@/components/ui";
import { getPerson, getSeries } from "@/lib/demo";
import { formatAmount, formatPercent } from "@/lib/nutrition/format";
import { resolveReference } from "@/lib/nutrition/personalize";
import { getAllTracked, getTracked } from "@/lib/nutrition/roster";
import {
  detectDeficiency,
  standardDeviation,
  trendPercent,
  type StreakResult,
} from "@/lib/nutrition/rollup";
import { hasTarget } from "@/lib/nutrition/types";
import type { TrackedNutrient } from "@/lib/nutrition/roster";
import { cn } from "@/lib/utils";

/** Nutrients the demo history carries a series for. */
const CHARTABLE = [
  "vitamin-c",
  "vitamin-d",
  "magnesium",
  "vitamin-b12",
  "lutein-zeaxanthin",
  "energy",
  "protein",
  "fiber",
];

interface Assessment {
  tracked: TrackedNutrient;
  target: number;
  streak: StreakResult;
}

export default function InsightsPage() {
  const person = getPerson();
  const tracked = getAllTracked();

  const assessments: Assessment[] = tracked.flatMap((item) => {
    const { entry } = item;
    if (!entry || !hasTarget(entry)) return [];

    const series = getSeries(item.meta.id);
    if (series.length === 0) return [];

    const target =
      resolveReference(entry.reference.rda, person)?.value ??
      resolveReference(entry.reference.ai, person)?.value;
    if (target === undefined) return [];

    return [{ tracked: item, target, streak: detectDeficiency(series, target, item.meta.storage) }];
  });

  const firing = assessments.filter((a) => a.streak.firing);
  const steady = assessments.filter((a) => !a.streak.firing);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        subtitle="Deficiency is judged over a window that matches how long the body holds a reserve, so a single short day never raises an alert and a quiet month-long shortfall does."
      />

      {firing.length > 0 ? (
        <div className="space-y-4">
          {firing.map((assessment) => (
            <StreakCard key={assessment.tracked.meta.id} assessment={assessment} firing />
          ))}
        </div>
      ) : (
        <Note>Nothing is running short across its assessment window.</Note>
      )}

      <Note>
        At most two alerts a day, and a nutrient you dismiss stays quiet for a week.
        Notification fatigue is why most trackers&apos; deficiency warnings get switched
        off within days of being switched on.
      </Note>

      <Card>
        <CardHeader
          title="Everything else"
          subtitle="Assessed and adequate. Shown so the absence of an alert reads as a result rather than an oversight."
        />
        <ul className="divide-y divide-border">
          {steady.map(({ tracked: item, streak, target }) => (
            <li key={item.meta.id} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <Link
                  href={`/nutrients/${item.meta.id}`}
                  className="text-sm text-ink underline-offset-2 hover:underline"
                >
                  {item.meta.name}
                </Link>
                <p className="text-[11px] text-faint">
                  {streak.windowDays}-day average{" "}
                  <span className="numeric">
                    {formatAmount(streak.windowMean, item.meta.unit, "simple")}
                  </span>{" "}
                  against a {formatAmount(target, item.meta.unit, "simple")} target
                </p>
              </div>
              <Badge tone="met">{formatPercent(streak.pctOfTarget)}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <PhytonutrientNote />

      <TrendExplorer />
    </div>
  );
}

function StreakCard({
  assessment,
  firing,
}: {
  assessment: Assessment;
  firing: boolean;
}) {
  const { tracked, target, streak } = assessment;
  const { meta, entry } = tracked;
  const { isExpert } = useDetailLevel();
  const series = getSeries(meta.id);

  // Brief entries carry a real target but no food sources yet, so an alert on
  // one names the shortfall without being able to name the fix. Say which,
  // rather than showing an empty "foods that close the gap" heading.
  const gapClosers = entry?.topSources?.slice(0, 3) ?? [];

  return (
    <Card className={cn(firing && "border-low")}>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/nutrients/${meta.id}`} className="underline-offset-2 hover:underline">
              {meta.name}
            </Link>
            <Badge tone="low">{formatPercent(streak.pctOfTarget)} of target</Badge>
          </span>
        }
        subtitle={
          meta.storage === "none"
            ? `Below 70% of your target for ${streak.consecutiveDaysBelow} days running.`
            : `Your ${streak.windowDays}-day average is ${formatAmount(streak.windowMean, meta.unit, "simple")} against a ${formatAmount(target, meta.unit, "simple")} target.`
        }
      />

      <StorageNote storage={meta.storage} />

      {meta.storage !== "none" ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          No single day here would have been worth an alert. The pattern across the
          window is.
        </p>
      ) : null}

      {gapClosers.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
            Foods that close the gap
          </p>
          <ul className="space-y-1.5">
            {gapClosers.map((source) => (
              <li key={source.name} className="flex justify-between gap-4 text-xs">
                <span className="text-ink">{source.name}</span>
                <span className="numeric shrink-0 text-muted">
                  {formatAmount(source.per100g, meta.unit, "simple")} per 100 g ·{" "}
                  {source.typicalServing}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-faint">
          Food sources for {meta.name} have not been written yet, so this alert can name
          the shortfall but not yet the fix.
        </p>
      )}

      <ExpertOnly>
        <div className="mt-4 border-t border-border pt-4">
          <DefinitionList
            items={[
              {
                term: `${streak.windowDays}-day mean`,
                value: (
                  <span className="numeric">
                    {formatAmount(streak.windowMean, meta.unit, "expert")}
                  </span>
                ),
              },
              {
                term: "σ across 30 days",
                value: (
                  <span className="numeric">
                    {formatAmount(standardDeviation(series), meta.unit, "expert")}
                  </span>
                ),
              },
              {
                term: "Trend",
                value: (
                  <span className="numeric">
                    {trendPercent(series) === null
                      ? "—"
                      : `${trendPercent(series)!.toFixed(1)}% second half vs first`}
                  </span>
                ),
              },
              {
                term: "Consecutive days below 70%",
                value: <span className="numeric">{streak.consecutiveDaysBelow}</span>,
              },
            ]}
          />
        </div>
      </ExpertOnly>

      {isExpert ? (
        <div className="mt-4">
          <TrendChart data={series} unit={meta.unit} target={target} targetLabel="RDA" />
        </div>
      ) : null}
    </Card>
  );
}

function PhytonutrientNote() {
  return (
    <Card>
      <CardHeader
        title="Why phytonutrients are not in the list above"
        subtitle="They are tracked, charted and trended — they are just never assessed against a target."
      />
      <p className="text-xs leading-relaxed text-muted">
        Lutein has no RDA, no deficiency disease and no upper limit. There is nothing to
        run short of, so there is nothing to alert on. What you get instead is the
        absolute amount, its trend, and what people typically eat — enough to situate
        yourself without a manufactured target.
      </p>
    </Card>
  );
}

function TrendExplorer() {
  const [selected, setSelected] = useState("vitamin-c");
  const person = getPerson();
  const tracked = getTracked(selected);
  const series = getSeries(selected);

  const entry = tracked?.entry;
  const target =
    entry && hasTarget(entry)
      ? (resolveReference(entry.reference.rda, person)?.value ??
        resolveReference(entry.reference.ai, person)?.value)
      : undefined;

  return (
    <Card>
      <CardHeader
        title="30-day trend"
        subtitle={
          tracked?.meta.tier === 3
            ? "No target line is drawn, because there is no target."
            : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {CHARTABLE.map((id) => {
          const item = getTracked(id);
          if (!item) return null;
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                selected === id
                  ? "border-transparent bg-ink text-bg"
                  : "border-border text-muted hover:text-ink",
              )}
            >
              {item.meta.name}
            </button>
          );
        })}
      </div>

      <TrendChart
        data={series}
        unit={tracked?.meta.unit ?? ""}
        target={target}
        targetLabel={entry && hasTarget(entry) && entry.reference.rda ? "RDA" : "AI"}
      />

      <ExpertOnly>
        <p className="numeric mt-3 text-[11px] text-faint">
          n={series.length} days · σ{" "}
          {formatAmount(standardDeviation(series), tracked?.meta.unit ?? "", "expert")} ·
          logging completeness is not modelled in the demo, so these averages assume
          every meal was logged
        </p>
      </ExpertOnly>
    </Card>
  );
}
