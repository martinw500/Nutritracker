"use client";

import Link from "next/link";
import { CoverageMeter } from "@/components/coverage-meter";
import { ExpertOnly, useDetailLevel } from "@/components/detail-level";
import { NutrientGroup } from "@/components/nutrient-group";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardHeader, DefinitionList, Note } from "@/components/ui";
import {
  getActiveGoalMode,
  getDayDate,
  getDayRollup,
  getPerson,
  getPlantDiversity,
  getSeries,
} from "@/lib/demo";
import { formatAmount } from "@/lib/nutrition/format";
import { getAllTracked, referenceCoverage } from "@/lib/nutrition/roster";

export default function TodayPage() {
  const { detail, isExpert } = useDetailLevel();
  const rollup = getDayRollup();
  const person = getPerson();
  const goalMode = getActiveGoalMode();
  const tracked = getAllTracked();
  const written = referenceCoverage();

  const byId = (id: string) => tracked.filter((t) => t.meta.id === id);
  const inTier = (tier: 1 | 2 | 3) => tracked.filter((t) => t.meta.tier === tier);
  const inCategory = (category: string) =>
    tracked.filter((t) => t.meta.category === category);

  const seriesFor = (id: string) => {
    const values = getSeries(id).slice(-7).map((day) => day.value);
    return values.length > 1 ? values : undefined;
  };

  const date = new Date(`${getDayDate()}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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

      <EnergyStrip rollup={rollup} detail={detail} />

      <NutrientGroup
        title="Macronutrients"
        subtitle="Energy, protein, carbohydrate, fat and their components."
        nutrients={inTier(1)}
        rollup={rollup}
        person={person}
      />

      <NutrientGroup
        title="Vitamins"
        subtitle="Against your personalised reference intake."
        nutrients={inCategory("vitamin")}
        rollup={rollup}
        person={person}
      />

      <NutrientGroup
        title="Minerals"
        nutrients={[...inCategory("mineral"), ...byId("choline")]}
        rollup={rollup}
        person={person}
      />

      <NutrientGroup
        title="Phytonutrients"
        subtitle="No reference intake exists for any of these, so none of them show a percentage or a progress bar — there is no target to be a percentage of. Absolute amounts and trends only."
        nutrients={inTier(3)}
        rollup={rollup}
        person={person}
        seriesFor={seriesFor}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <CoverageMeter
          covered={rollup.phytoCoveredCount}
          total={rollup.entryCount}
        />
        <PlantDiversityCard />
      </div>

      <ExpertOnly>
        <DerivedMetrics rollup={rollup} />
      </ExpertOnly>

      <Note>
        {written.written} of {written.total} nutrients have a written reference panel.
        The rest are tracked and totalled, but show no target until their panel is
        written — see <Link href="/nutrients" className="underline">Nutrients</Link>.
      </Note>
    </div>
  );
}

function EnergyStrip({
  rollup,
  detail,
}: {
  rollup: ReturnType<typeof getDayRollup>;
  detail: "simple" | "expert";
}) {
  const cells = [
    { id: "energy", label: "Energy", unit: "kcal" },
    { id: "protein", label: "Protein", unit: "g" },
    { id: "carbohydrate", label: "Carbs", unit: "g" },
    { id: "fat-total", label: "Fat", unit: "g" },
    { id: "fiber", label: "Fiber", unit: "g" },
  ];

  return (
    <Card className="!p-0">
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-5 sm:divide-y-0">
        {cells.map((cell) => {
          const value = rollup.totals[cell.id];
          return (
            <div key={cell.id} className="px-5 py-4">
              <p className="text-[11px] uppercase tracking-wide text-faint">
                {cell.label}
              </p>
              <p className="numeric mt-1 text-lg text-ink">
                {value === undefined ? "—" : formatAmount(value, cell.unit, detail)}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PlantDiversityCard() {
  const diversity = getPlantDiversity();

  return (
    <Card>
      <CardHeader
        title="Plant diversity"
        subtitle="Distinct plant species eaten. The 30-a-week figure comes from the American Gut Project and is an observational association, not a requirement."
      />

      <div className="flex items-baseline gap-2">
        <span className="numeric text-2xl text-ink">{diversity.todaySpecies.length}</span>
        <span className="text-xs text-muted">species today</span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {diversity.todaySpecies.map((species) => (
          <li
            key={species}
            className="rounded-md border border-border px-1.5 py-0.5 text-[11px] italic text-muted"
          >
            {species}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        The weekly figure the 30 target refers to is distinct species across seven
        days, which cannot be derived from daily counts without double-counting
        repeats. It arrives with the real log rather than being estimated here.
      </p>
    </Card>
  );
}

function DerivedMetrics({ rollup }: { rollup: ReturnType<typeof getDayRollup> }) {
  const totals = rollup.totals;
  const person = getPerson();
  void person;

  const ratio = (a?: number, b?: number) =>
    a === undefined || b === undefined || b === 0 ? "—" : `${(a / b).toFixed(1)} : 1`;

  const omega6 = totals["omega-6-linoleic"];
  const omega3 = (totals["omega-3-ala"] ?? 0) + (totals["omega-3-epa-dha"] ?? 0) / 1000;

  return (
    <Card>
      <CardHeader
        title="Derived metrics"
        subtitle="Computed, not stored. Expert mode only."
      />
      <DefinitionList
        items={[
          {
            term: "Omega-6 : omega-3",
            value: <span className="numeric">{ratio(omega6, omega3 || undefined)}</span>,
          },
          {
            term: "Sodium : potassium",
            value: (
              <span className="numeric">
                {ratio(totals["sodium"], totals["potassium"])}
              </span>
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
            term: "Glycemic load, day",
            value: <span className="numeric">{rollup.glycemicLoad.toFixed(1)}</span>,
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
                {totals["energy"]
                  ? `${((totals["magnesium"] ?? 0) / (totals["energy"] / 100)).toFixed(1)} mg Mg / 100 kcal`
                  : "—"}
              </span>
            ),
          },
        ]}
      />
    </Card>
  );
}
