"use client";

/**
 * The whole day at a glance — all 59 tracked values as tiles, grouped.
 *
 * This replaces a wall of ~33 near-identical rows as the FIRST thing you see.
 * The rows are not deleted: a group header expands to exactly the same
 * `NutrientRow` list as before. Fold, don't remove.
 *
 * Every tile carries colour AND a shape AND the state in words in its tooltip,
 * because the status colours are not distinguishable on their own — see
 * `status-glyph.tsx`. The "needs attention" line above the grid names the
 * nutrients in plain text, so the most important reading of this component
 * requires no colour vision at all.
 */

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDetailLevel } from "@/components/detail-level";
import { NutrientRow } from "@/components/nutrient-row";
import { StatusGlyph } from "@/components/status-glyph";
import { Card, CardHeader } from "@/components/ui";
import type { Person } from "@/lib/nutrition/personalize";
import type { TrackedNutrient } from "@/lib/nutrition/roster";
import type { DayRollup } from "@/lib/nutrition/rollup";
import {
  resolveTile,
  severityRank,
  TILE_TONE,
  type TileContext,
  type TileInfo,
  type TileState,
} from "@/lib/nutrition/tile-state";
import { cn } from "@/lib/utils";

export interface NutrientSection {
  title: string;
  nutrients: readonly TrackedNutrient[];
  /** Tier 3 sections say why no tile is coloured by status. */
  note?: string;
}

interface Resolved {
  tracked: TrackedNutrient;
  tile: TileInfo;
  amount: number | undefined;
}

export function StatusGrid({
  sections,
  rollup,
  person,
  context,
  seriesFor,
}: {
  sections: readonly NutrientSection[];
  rollup: DayRollup;
  person: Person;
  context?: TileContext;
  seriesFor?: (id: string) => readonly number[] | undefined;
}) {
  const { isExpert } = useDetailLevel();
  const [open, setOpen] = useState<string | null>(null);

  const resolve = (nutrients: readonly TrackedNutrient[]): Resolved[] =>
    nutrients.map((tracked) => {
      const amount = rollup.totals[tracked.meta.id];
      return { tracked, amount, tile: resolveTile(tracked, amount, person, context) };
    });

  const everything = sections.flatMap((section) => resolve(section.nutrients));
  const attention = everything
    .filter((item) => item.tile.state === "low" || item.tile.state === "over-ul")
    .sort((a, b) => severityRank(a.tile.state) - severityRank(b.tile.state));

  return (
    <Card>
      <CardHeader
        title="Where you stand"
        subtitle={`All ${everything.length} tracked values. Tap a group to see the numbers.`}
      />

      {attention.length > 0 ? (
        <p className="mb-5 text-sm leading-relaxed text-ink">
          <span className="font-medium">
            {attention.length} need{attention.length === 1 ? "s" : ""} attention:
          </span>{" "}
          {attention.map((item, index) => (
            <span key={item.tracked.meta.id}>
              {index > 0 ? ", " : ""}
              <Link
                href={`/nutrients/${item.tracked.meta.id}`}
                className={cn("underline-offset-2 hover:underline", TILE_TONE[item.tile.state].text)}
              >
                {item.tracked.meta.name}
              </Link>
              <span className="text-muted"> ({item.tile.label.toLowerCase()})</span>
            </span>
          ))}
        </p>
      ) : (
        <p className="mb-5 text-sm text-muted">
          Nothing is low or over a limit today.
        </p>
      )}

      <div className="space-y-4">
        {sections.map((section) => {
          const items = resolve(section.nutrients);
          const isOpen = open === section.title;

          return (
            <div key={section.title}>
              <button
                onClick={() => setOpen(isOpen ? null : section.title)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 rounded-md py-1 text-left"
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 text-faint transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
                  {section.title}
                </span>
                <span className="numeric text-[11px] text-faint">
                  {section.nutrients.length}
                </span>
              </button>

              {section.note ? (
                <p className="mb-2 ml-5 text-[11px] leading-relaxed text-faint">
                  {section.note}
                </p>
              ) : null}

              <div className="ml-5 flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <Tile key={item.tracked.meta.id} item={item} />
                ))}
              </div>

              {isOpen ? (
                <div className="ml-5 mt-3 divide-y divide-border border-t border-border pt-1">
                  {(isExpert
                    ? section.nutrients
                    : section.nutrients.filter((n) => n.meta.headline)
                  ).map((tracked) => (
                    <NutrientRow
                      key={tracked.meta.id}
                      tracked={tracked}
                      amount={rollup.totals[tracked.meta.id]}
                      contributors={rollup.contributors[tracked.meta.id] ?? 0}
                      entryCount={rollup.entryCount}
                      person={person}
                      series={seriesFor?.(tracked.meta.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <Legend />
    </Card>
  );
}

function Tile({ item }: { item: Resolved }) {
  const { tracked, tile } = item;
  const tone = TILE_TONE[tile.state];

  return (
    <Link
      href={`/nutrients/${tracked.meta.id}`}
      title={`${tracked.meta.name} — ${tile.label}`}
      className={cn(
        "flex size-8 items-center justify-center rounded-tile border transition-transform hover:scale-110",
        tone.soft,
        tone.text,
        tile.state === "no-data" || tile.state === "no-reference"
          ? "border-dashed border-nodata"
          : "border-transparent",
      )}
    >
      <StatusGlyph state={tile.state} />
      <span className="sr-only">
        {tracked.meta.name}: {tile.label}
      </span>
    </Link>
  );
}

const LEGEND: Array<{ state: TileState; label: string }> = [
  { state: "met", label: "met" },
  { state: "below-target", label: "under target" },
  { state: "low", label: "low" },
  { state: "over-ul", label: "over limit" },
  { state: "no-target", label: "no target exists" },
  { state: "no-data", label: "no data" },
  { state: "no-reference", label: "no reference written" },
];

function Legend() {
  return (
    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-4">
      {LEGEND.map((item) => (
        <span
          key={item.state}
          className={cn("flex items-center gap-1.5 text-[11px]", TILE_TONE[item.state].text)}
        >
          <StatusGlyph state={item.state} size={11} />
          <span className="text-muted">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
