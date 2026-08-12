"use client";

/**
 * The dense, labelled nutrient table. Replaces the dot grid, which did not work.
 *
 * The grid failed for a specific reason worth recording: it borrowed the
 * contribution-graph layout, where a tile's POSITION is its label (this cell is
 * the 4th of March). Here position labels nothing, so every mark was anonymous
 * and the only way to identify one was to hover it. A legend cannot fix that —
 * it explains the colours, not which nutrient you are looking at.
 *
 * So: every row is named, carries its own bar, its number, and its status in
 * words. No legend needed, nothing to decode.
 *
 * Simple mode shows the headline set with a per-section expander; expert mode
 * shows everything. That expander is also the per-section disclosure that keeps
 * detail reachable without flipping a global switch.
 */

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDetailLevel } from "@/components/detail-level";
import { NoDataChip } from "@/components/no-data-chip";
import { Sparkline } from "@/components/sparkline";
import { StatusGlyph } from "@/components/status-glyph";
import { Badge, Card, CardHeader } from "@/components/ui";
import { formatAmount, formatPercent } from "@/lib/nutrition/format";
import type { Person } from "@/lib/nutrition/personalize";
import type { TrackedNutrient } from "@/lib/nutrition/roster";
import type { DayRollup } from "@/lib/nutrition/rollup";
import {
  isStatusState,
  resolveTile,
  severityRank,
  TILE_TONE,
  type TileContext,
  type TileInfo,
} from "@/lib/nutrition/tile-state";
import { isFullEntry } from "@/lib/nutrition/types";
import { cn } from "@/lib/utils";

export interface NutrientSection {
  title: string;
  nutrients: readonly TrackedNutrient[];
  /** Shown under the section title. Tier 3 uses it to say why there are no bars. */
  note?: string;
}

interface Row {
  tracked: TrackedNutrient;
  amount: number | undefined;
  tile: TileInfo;
}

export function NutrientTable({
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
  const everything = sections.flatMap((section) =>
    section.nutrients.map((tracked) => toRow(tracked, rollup, person, context)),
  );

  const attention = everything
    .filter((row) => row.tile.state === "low" || row.tile.state === "over-ul")
    .sort((a, b) => severityRank(a.tile.state) - severityRank(b.tile.state));

  return (
    <div className="space-y-4">
      <AttentionBanner rows={attention} total={everything.length} />

      {sections.map((section) => (
        <Section
          key={section.title}
          section={section}
          rollup={rollup}
          person={person}
          context={context}
          seriesFor={seriesFor}
        />
      ))}
    </div>
  );
}

function toRow(
  tracked: TrackedNutrient,
  rollup: DayRollup,
  person: Person,
  context?: TileContext,
): Row {
  const amount = rollup.totals[tracked.meta.id];
  return { tracked, amount, tile: resolveTile(tracked, amount, person, context) };
}

function AttentionBanner({ rows, total }: { rows: Row[]; total: number }) {
  if (rows.length === 0) {
    return (
      <Card className="!py-4">
        <p className="text-sm text-ink">
          <span className="font-medium">Nothing is running low.</span>{" "}
          <span className="text-muted">All {total} tracked values checked.</span>
        </p>
      </Card>
    );
  }

  return (
    <Card className="!py-4">
      <p className="text-sm leading-relaxed text-ink">
        <span className="font-medium">
          {rows.length} need{rows.length === 1 ? "s" : ""} attention
        </span>{" "}
        <span className="text-muted">of {total} tracked</span>
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {rows.map((row) => (
          <li key={row.tracked.meta.id}>
            <Link
              href={`/nutrients/${row.tracked.meta.id}`}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm underline-offset-2 hover:underline",
                TILE_TONE[row.tile.state].text,
              )}
            >
              <StatusGlyph state={row.tile.state} size={11} />
              {row.tracked.meta.name}
              <span className="text-muted">
                {row.tile.status?.pct !== null && row.tile.status?.pct !== undefined
                  ? formatPercent(row.tile.status.pct)
                  : row.tile.label.toLowerCase()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Section({
  section,
  rollup,
  person,
  context,
  seriesFor,
}: {
  section: NutrientSection;
  rollup: DayRollup;
  person: Person;
  context?: TileContext;
  seriesFor?: (id: string) => readonly number[] | undefined;
}) {
  const { isExpert } = useDetailLevel();
  const [expanded, setExpanded] = useState(false);

  const rows = section.nutrients.map((tracked) =>
    toRow(tracked, rollup, person, context),
  );

  const showAll = isExpert || expanded;
  const visible = showAll ? rows : rows.filter((row) => row.tracked.meta.headline);
  const hidden = rows.length - visible.length;

  const assessed = rows.filter((row) => isStatusState(row.tile.state));
  const met = assessed.filter((row) => row.tile.state === "met").length;

  return (
    <Card>
      <CardHeader
        title={section.title}
        subtitle={section.note}
        aside={
          assessed.length > 0 ? (
            <span className="numeric whitespace-nowrap text-xs text-muted">
              {met} of {assessed.length} met
            </span>
          ) : null
        }
      />

      <div className="grid gap-x-8 lg:grid-cols-2">
        {visible.map((row) => (
          <NutrientLine
            key={row.tracked.meta.id}
            row={row}
            series={seriesFor?.(row.tracked.meta.id)}
          />
        ))}
      </div>

      {hidden > 0 ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
        >
          <ChevronDown className="size-3.5" />
          Show all {rows.length}
        </button>
      ) : null}

      {expanded && !isExpert ? (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 text-xs font-medium text-muted hover:text-ink"
        >
          Show less
        </button>
      ) : null}
    </Card>
  );
}

function NutrientLine({
  row,
  series,
}: {
  row: Row;
  series?: readonly number[];
}) {
  const { detail, isExpert } = useDetailLevel();
  const { tracked, amount, tile } = row;
  const { meta, entry } = tracked;
  const tone = TILE_TONE[tile.state];

  const pct = tile.status?.pct ?? null;
  const isStatus = isStatusState(tile.state);

  return (
    <div className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
      <Link
        href={`/nutrients/${meta.id}`}
        className="min-w-0 flex-1 truncate text-sm text-ink underline-offset-2 hover:underline"
        title={`${meta.name} — ${tile.label}`}
      >
        {meta.name}
        {entry !== null && !isFullEntry(entry) && isExpert ? (
          <span className="ml-1.5 text-[10px] text-faint">brief</span>
        ) : null}
      </Link>

      {/* The bar exists only where a target does. Tier 3 gets a sparkline
          instead — a trend with no implied "should". CLAUDE.md rule 3. */}
      <div className="hidden w-24 shrink-0 sm:block">
        {isStatus && pct !== null ? (
          <div
            role="meter"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${meta.name}: ${formatPercent(pct, detail)} of target`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
          >
            <div
              className={cn("h-full rounded-full", tone.fill)}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        ) : series && series.length > 1 ? (
          <Sparkline values={series} width={96} height={16} label={`${meta.name} trend`} />
        ) : null}
      </div>

      <span className="numeric w-20 shrink-0 text-right text-xs text-ink">
        {amount === undefined ? (
          <NoDataChip
            reason={
              meta.tier === 3
                ? "None of today's foods are in USDA's phytonutrient databases"
                : "No logged food carried a value for this nutrient"
            }
          />
        ) : (
          formatAmount(amount, meta.unit, detail)
        )}
      </span>

      <span
        className={cn(
          "flex w-24 shrink-0 items-center justify-end gap-1.5 text-xs",
          tone.text,
        )}
      >
        {amount === undefined ? null : (
          <>
            <StatusGlyph state={tile.state} size={10} />
            {isStatus && pct !== null ? (
              <span className="numeric">{formatPercent(pct, detail)}</span>
            ) : (
              <span className="truncate text-[11px] text-muted" title={tile.label}>
                {shortLabel(tile.label)}
              </span>
            )}
          </>
        )}
      </span>
    </div>
  );
}

/** Keeps the right-hand column narrow without clipping mid-word. */
function shortLabel(label: string): string {
  const map: Record<string, string> = {
    "Tracked, no target exists": "no target",
    "No reference written yet": "no reference",
    "No reference for this age": "no reference",
    "Within the acceptable range": "in range",
    "Below the acceptable range": "below range",
    "Above the acceptable range": "above range",
    "Drinks are not logged yet — food only": "food only",
  };
  return map[label] ?? label.toLowerCase();
}

/** Small standalone legend, for pages that want one. The table does not need it. */
export function StatusLegend() {
  const items = [
    { state: "met", label: "target met" },
    { state: "below-target", label: "under target" },
    { state: "low", label: "low" },
    { state: "over-ul", label: "over limit" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <Badge key={item.state} tone="quiet">
          <span className={TILE_TONE[item.state].text}>
            <StatusGlyph state={item.state} size={10} />
          </span>
          {item.label}
        </Badge>
      ))}
    </div>
  );
}
