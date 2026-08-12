"use client";

import Link from "next/link";
import { useState } from "react";
import { Aperture, Plus, Search } from "lucide-react";
import { ExpertOnly, useDetailLevel } from "@/components/detail-level";
import { FlagChips } from "@/components/food-flags";
import { resolveFoodAttributes } from "@/lib/nutrition/attributes";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardHeader, Empty, Note } from "@/components/ui";
import {
  getDayDate,
  getDayRollup,
  getEntriesByMeal,
  getFoods,
  type ResolvedEntry,
} from "@/lib/demo";
import { formatAmount } from "@/lib/nutrition/format";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

export default function LogPage() {
  const meals = getEntriesByMeal();
  const rollup = getDayRollup();
  const { detail } = useDetailLevel();

  const date = new Date(`${getDayDate()}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log"
        subtitle={date}
        aside={
          <Link
            href="/log/photo"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Aperture className="size-4" strokeWidth={2} />
            Log a photo
          </Link>
        }
      />

      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span>
          <span className="numeric text-ink">{rollup.entryCount}</span> items
        </span>
        <span>
          <span className="numeric text-ink">
            {formatAmount(rollup.totals["energy"] ?? 0, "kcal", detail)}
          </span>{" "}
          total
        </span>
        <span>
          glycemic load{" "}
          <span className="numeric text-ink">{rollup.glycemicLoad.toFixed(0)}</span>
        </span>
      </div>

      {meals.map(({ meal, entries }) => (
        <MealCard
          key={meal}
          meal={meal}
          entries={entries}
          glycemicLoad={rollup.glycemicLoadByMeal[meal] ?? 0}
        />
      ))}

      <AddFoodCard />
    </div>
  );
}

function MealCard({
  meal,
  entries,
  glycemicLoad,
}: {
  meal: string;
  entries: ResolvedEntry[];
  glycemicLoad: number;
}) {
  const { detail } = useDetailLevel();
  const energy = entries.reduce(
    (sum, entry) => sum + (entry.resolvedNutrients["energy"] ?? 0),
    0,
  );

  return (
    <Card>
      <CardHeader
        title={MEAL_LABEL[meal] ?? meal}
        subtitle={new Date(entries[0].loggedAt).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
        aside={
          <div className="text-right">
            <p className="numeric text-sm text-ink">
              {formatAmount(energy, "kcal", detail)}
            </p>
            <ExpertOnly>
              <p className="numeric text-[11px] text-faint">GL {glycemicLoad.toFixed(1)}</p>
            </ExpertOnly>
          </div>
        }
      />

      <ul className="divide-y divide-border">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start justify-between gap-4 py-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink">{entry.food.name}</span>
                <SourceBadge entry={entry} />
                {entry.resolvedPhytonutrients === null ? (
                  <Badge
                    tone="quiet"
                    title="This food is not in USDA's flavonoid, isoflavone or proanthocyanidin databases. Its phytonutrient contribution is unknown, not zero."
                  >
                    no phyto data
                  </Badge>
                ) : null}
              </div>

              <div className="mt-1">
                <FlagChips attributes={resolveFoodAttributes(entry.food)} />
              </div>
              <ExpertOnly>
                <p className="numeric mt-0.5 text-[11px] text-faint">
                  {entry.food.fdcDataType} · fdcId {entry.food.fdcId ?? "unresolved"}
                  {entry.food.plantSpecies ? ` · ${entry.food.plantSpecies}` : ""}
                </p>
              </ExpertOnly>
            </div>

            <div className="shrink-0 text-right">
              <p className="numeric text-sm text-ink">
                {entry.quantity} {entry.unit}
              </p>
              <p className="numeric text-[11px] text-faint">
                {formatAmount(entry.resolvedNutrients["energy"] ?? 0, "kcal", detail)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SourceBadge({ entry }: { entry: ResolvedEntry }) {
  if (entry.source !== "photo") {
    return <Badge tone="quiet">{entry.source}</Badge>;
  }

  const low = (entry.aiConfidence ?? 1) < 0.75;
  return (
    <>
      <Badge tone={low ? "low" : "quiet"} title="Identified from a photo, then confirmed by you">
        photo {Math.round((entry.aiConfidence ?? 0) * 100)}%
      </Badge>
      {entry.userEdited ? <Badge tone="quiet">edited</Badge> : null}
    </>
  );
}

/**
 * Manual entry. It matters that this works with no AI configured at all —
 * bring-your-own-key means some users will never connect one, and an app that
 * is useless without a key has a hard wall at signup. See docs/DECISIONS.md
 * (D2, D11).
 */
function AddFoodCard() {
  const [query, setQuery] = useState("");
  const foods = getFoods();
  const matches = query
    ? foods.filter((food) => food.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <Card>
      <CardHeader
        title="Add food"
        subtitle="Manual logging works with no AI connected. It is the whole app for anyone who never brings a key."
      />

      <div className="flex items-center gap-2 rounded-lg border border-border bg-sunken px-3 py-2">
        <Search className="size-4 shrink-0 text-faint" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search foods…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
        />
      </div>

      {query === "" ? (
        <p className="mt-3 text-xs text-faint">
          Searching the 12 demo foods. The real search runs against a local mirror of
          Foundation Foods and SR Legacy — the FoodData Central API allows 1,000
          requests an hour, nowhere near enough to serve live traffic.
        </p>
      ) : matches.length === 0 ? (
        <div className="mt-3">
          <Empty>No demo food matches “{query}”.</Empty>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {matches.map((food) => (
            <li key={food.id} className="flex items-center justify-between gap-4 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{food.name}</p>
                <p className="numeric text-[11px] text-faint">
                  {food.nutrients["energy"] ?? "—"} kcal / 100 g
                  {food.gi !== null ? ` · GI ${food.gi}` : ""}
                </p>
              </div>
              <button
                disabled
                title="Not wired up — there is no database to write to yet."
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-faint"
              >
                <Plus className="size-3.5" />
                Add
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Note>
          Nothing on this screen writes anywhere. There is no database yet — see
          docs/STATUS.md.
        </Note>
      </div>
    </Card>
  );
}
