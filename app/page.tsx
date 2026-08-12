"use client";

import Link from "next/link";
import { CoverageMeter } from "@/components/coverage-meter";
import { ExpertOnly } from "@/components/detail-level";
import { EnergyRing } from "@/components/energy-ring";
import { MacroBars } from "@/components/macro-bars";
import { MealStrip } from "@/components/meal-strip";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { StatusGrid, type NutrientSection } from "@/components/status-grid";
import { DayColumns, TrendChart } from "@/components/trend-chart";
import { Badge, Card, CardHeader, DefinitionList, Note } from "@/components/ui";
import { WaterWidget } from "@/components/water-widget";
import { WeightCard } from "@/components/weight-card";
import {
  getActiveGoalMode,
  getDayDate,
  getDayRollup,
  getEntriesByMeal,
  getEnergyEstimate,
  getPerson,
  getPlantDiversity,
  getSeries,
  getWeightSeries,
} from "@/lib/demo";
import { resolveReference } from "@/lib/nutrition/personalize";
import { getAllTracked, getTracked, referenceCoverage } from "@/lib/nutrition/roster";
import { hasTarget } from "@/lib/nutrition/types";

const MACRO_IDS = ["protein", "carbohydrate", "fat-total"];

export default function TodayPage() {
  const rollup = getDayRollup();
  const person = getPerson();
  const estimate = getEnergyEstimate();
  const goalMode = getActiveGoalMode();
  const tracked = getAllTracked();
  const written = referenceCoverage();

  const energy = rollup.totals["energy"] ?? 0;

  const byIds = (ids: string[]) =>
    ids.flatMap((id) => {
      const item = getTracked(id);
      return item ? [item] : [];
    });

  const sections: NutrientSection[] = [
    {
      title: "Macronutrients",
      nutrients: tracked.filter((t) => t.meta.tier === 1),
    },
    {
      title: "Vitamins",
      nutrients: tracked.filter((t) => t.meta.category === "vitamin"),
    },
    {
      title: "Minerals",
      nutrients: tracked.filter(
        (t) => t.meta.category === "mineral" || t.meta.id === "choline",
      ),
    },
    {
      title: "Phytonutrients",
      nutrients: tracked.filter((t) => t.meta.tier === 3),
      note: "None of these are coloured by status, because none of them have a target to be measured against.",
    },
  ];

  const seriesFor = (id: string) => {
    const values = getSeries(id).slice(-7).map((day) => day.value);
    return values.length > 1 ? values : undefined;
  };

  const date = new Date(`${getDayDate()}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const proteinEntry = getTracked("protein")?.entry;
  const proteinTarget =
    proteinEntry && hasTarget(proteinEntry)
      ? resolveReference(proteinEntry.reference.rda, person)?.value
      : undefined;

  const diversity = getPlantDiversity();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today"
        subtitle={date}
        aside={
          <Link href="/settings">
            <Badge tone="accent">{goalMode.name}</Badge>
          </Link>
        }
      />

      <EnergyRing consumed={energy} estimate={estimate} />

      <MacroBars
        macros={byIds(MACRO_IDS)}
        totals={rollup.totals}
        energyConsumed={energy}
        estimate={estimate}
        person={person}
      />

      <StatusGrid
        sections={sections}
        rollup={rollup}
        person={person}
        context={{
          energyKcal: energy,
          unassessable: {
            // The AI is total water, drinks included, and drinks are not logged
            // as foods. Judging water on the ~1 L that arrives in food would
            // report "low" to someone perfectly well hydrated. The widget below
            // tracks what you actually drank.
            water: "Drinks are not logged yet — food only",
          },
        }}
        seriesFor={seriesFor}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Fiber"
          value={Math.round(rollup.totals["fiber"] ?? 0)}
          unit="g"
          note="Most under-eaten thing in the diet"
          series={seriesFor("fiber")}
          href="/nutrients/fiber"
        />
        <StatTile
          label="Plant species"
          value={diversity.todaySpecies.length}
          note={`${diversity.target} a week is the diversity target`}
          tone="accent"
        />
        <StatTile
          label="Glycemic load"
          value={rollup.glycemicLoad.toFixed(0)}
          note="Across the whole day"
        />
        <StatTile
          label="Phyto coverage"
          value={Math.round(rollup.phytoCoverage * 100)}
          unit="%"
          note={`${rollup.phytoCoveredCount} of ${rollup.entryCount} foods have data`}
        />
      </div>

      <MealStrip
        meals={getEntriesByMeal()}
        glycemicLoadByMeal={rollup.glycemicLoadByMeal}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Energy, last 7 days"
            subtitle="Today in the accent; the estimated need marked as a threshold."
          />
          <DayColumns
            data={getSeries("energy").slice(-7)}
            unit="kcal"
            target={Math.round(estimate.estimatedNeed)}
            targetLabel="estimated need"
          />
        </Card>

        <Card>
          <CardHeader
            title="Protein, last 30 days"
            subtitle="Against your RDA, which is a floor rather than a goal."
          />
          <TrendChart
            data={getSeries("protein")}
            unit="g"
            target={proteinTarget}
            targetLabel="RDA"
            height={150}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WaterWidget
          tracked={getTracked("water")}
          fromFoodMl={rollup.totals["water"]}
          person={person}
        />
        <WeightCard readings={getWeightSeries()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CoverageMeter covered={rollup.phytoCoveredCount} total={rollup.entryCount} />
        <PlantDiversityCard />
      </div>

      <ExpertOnly>
        <DerivedMetrics rollup={rollup} energy={energy} />
      </ExpertOnly>

      <Note>
        {written.written} of {written.total} nutrients have a written reference panel.
        The rest are tracked and totalled, but show no target until their panel is
        written — see <Link href="/nutrients" className="text-accent underline">Nutrients</Link>.
      </Note>
    </div>
  );
}

function PlantDiversityCard() {
  const diversity = getPlantDiversity();

  return (
    <Card>
      <CardHeader
        title="Plant diversity"
        subtitle="The 30-a-week figure comes from the American Gut Project. It is an observational association, not a requirement."
      />

      <div className="flex items-baseline gap-2">
        <span className="hero-figure text-2xl font-semibold text-ink">
          {diversity.todaySpecies.length}
        </span>
        <span className="text-xs text-muted">species today</span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {diversity.todaySpecies.map((species) => (
          <li
            key={species}
            className="rounded-md bg-sunken px-2 py-0.5 text-[11px] italic text-muted"
          >
            {species}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        The weekly figure the target refers to is distinct species across seven days,
        which cannot be derived from daily counts without double-counting repeats. It
        arrives with the real log rather than being estimated here.
      </p>
    </Card>
  );
}

function DerivedMetrics({
  rollup,
  energy,
}: {
  rollup: ReturnType<typeof getDayRollup>;
  energy: number;
}) {
  const totals = rollup.totals;

  const ratio = (a?: number, b?: number) =>
    a === undefined || b === undefined || b === 0 ? "—" : `${(a / b).toFixed(1)} : 1`;

  const omega3 = (totals["omega-3-ala"] ?? 0) + (totals["omega-3-epa-dha"] ?? 0) / 1000;

  return (
    <Card>
      <CardHeader title="Derived metrics" subtitle="Computed, not stored." />
      <DefinitionList
        items={[
          {
            term: "Omega-6 : omega-3",
            value: (
              <span className="numeric">
                {ratio(totals["omega-6-linoleic"], omega3 || undefined)}
              </span>
            ),
          },
          {
            term: "Sodium : potassium",
            value: (
              <span className="numeric">{ratio(totals["sodium"], totals["potassium"])}</span>
            ),
          },
          {
            term: "Protein per kg bodyweight",
            value: (
              <span className="numeric">
                {totals["protein"] === undefined
                  ? "—"
                  : `${(totals["protein"] / 74).toFixed(2)} g/kg`}
              </span>
            ),
          },
          {
            term: "Glycemic load by meal",
            value: (
              <span className="numeric">
                {Object.entries(rollup.glycemicLoadByMeal)
                  .map(([meal, value]) => `${meal} ${value.toFixed(0)}`)
                  .join(" · ")}
              </span>
            ),
          },
          {
            term: "Nutrient density",
            value: (
              <span className="numeric">
                {energy
                  ? `${((totals["magnesium"] ?? 0) / (energy / 100)).toFixed(1)} mg Mg / 100 kcal`
                  : "—"}
              </span>
            ),
          },
        ]}
      />
    </Card>
  );
}
