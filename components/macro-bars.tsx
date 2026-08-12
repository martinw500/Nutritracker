"use client";

/**
 * Protein, carbohydrate and fat against their references.
 *
 * Two things here are deliberate:
 *
 * 1. **The target is a band, not a line.** The AMDR is published as a range of
 *    percent-of-energy, and total fat has no RDA or AI at all. Drawing a single
 *    target line would invent a precision the reference does not have, so the
 *    acceptable range is shaded behind the bar and the RDA, where one exists,
 *    is marked as a separate tick.
 *
 *    The band is computed against the energy ACTUALLY EATEN, not against the
 *    estimated need. The AMDR describes the composition of a diet — "20 to 35%
 *    of your energy came from fat" — so the denominator has to be the energy
 *    that was consumed. Using estimated need instead silently turns a
 *    composition question into an adequacy one, and made the bar and the status
 *    tile give two different verdicts about the same number.
 *
 * 2. **The colours are identity, not judgement.** Blue/orange/aqua are the
 *    first three slots of a validated categorical palette — they say "this is
 *    protein" and nothing about whether the amount is good. Each is
 *    direct-labelled, which is also the relief required for aqua's contrast on
 *    the light surface.
 */

import Link from "next/link";
import { ExpertOnly, useDetailLevel } from "@/components/detail-level";
import { Card, CardHeader } from "@/components/ui";
import {
  macroRangeGrams,
  percentOfEnergy,
  type EnergyEstimate,
} from "@/lib/nutrition/energy";
import { formatAmount } from "@/lib/nutrition/format";
import { resolveReference, type Person } from "@/lib/nutrition/personalize";
import type { TrackedNutrient } from "@/lib/nutrition/roster";
import { hasTarget } from "@/lib/nutrition/types";
import { cn } from "@/lib/utils";

const SERIES: Record<string, { bar: string; text: string }> = {
  protein: { bar: "bg-protein", text: "text-protein" },
  carbohydrate: { bar: "bg-carb", text: "text-carb" },
  "fat-total": { bar: "bg-fat", text: "text-fat" },
};

export function MacroBars({
  macros,
  totals,
  energyConsumed,
  estimate,
  person,
}: {
  macros: readonly TrackedNutrient[];
  totals: Readonly<Record<string, number>>;
  energyConsumed: number;
  estimate: EnergyEstimate;
  person: Person;
}) {
  return (
    <Card>
      <CardHeader
        title="Macronutrients"
        subtitle="The shaded band is the acceptable range for that macronutrient's share of your energy. It is a range, not a number, because that is how the reference is published."
      />

      <div className="space-y-5">
        {macros.map((tracked) => (
          <MacroBar
            key={tracked.meta.id}
            tracked={tracked}
            grams={totals[tracked.meta.id]}
            energyConsumed={energyConsumed}
            estimate={estimate}
            person={person}
          />
        ))}
      </div>
    </Card>
  );
}

function MacroBar({
  tracked,
  grams,
  energyConsumed,
  estimate,
  person,
}: {
  tracked: TrackedNutrient;
  grams: number | undefined;
  energyConsumed: number;
  estimate: EnergyEstimate;
  person: Person;
}) {
  const { detail, isExpert } = useDetailLevel();
  const { meta, entry } = tracked;
  const series = SERIES[meta.id] ?? { bar: "bg-accent", text: "text-accent" };

  if (grams === undefined || entry === null || !hasTarget(entry)) {
    return (
      <div className="text-xs text-faint">
        {meta.name} — no data
      </div>
    );
  }

  const amdr = entry.reference.amdr ?? null;
  const rda = resolveReference(entry.reference.rda, person);
  const ai = resolveReference(entry.reference.ai, person);
  const floor = rda ?? ai;

  const band = amdr ? macroRangeGrams(meta.id, amdr, energyConsumed) : null;
  const shareOfEnergy = percentOfEnergy(meta.id, grams, energyConsumed);

  // Scale so the whole band plus a margin is visible, and an over-band intake
  // still fits on screen.
  const axisMax = Math.max(band ? band.highGrams * 1.15 : 0, grams * 1.1, floor?.value ?? 0);
  const pctOf = (value: number) => Math.min((value / axisMax) * 100, 100);

  const inBand = band ? grams >= band.lowGrams && grams <= band.highGrams : null;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <Link
          href={`/nutrients/${meta.id}`}
          className={cn("text-sm font-medium underline-offset-2 hover:underline", series.text)}
        >
          {meta.name}
        </Link>
        <span className="numeric text-sm text-ink">
          {formatAmount(grams, meta.unit, detail)}
          {shareOfEnergy !== null ? (
            <span className="ml-2 text-faint">{Math.round(shareOfEnergy)}% of energy</span>
          ) : null}
        </span>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-sunken">
        {band ? (
          <div
            aria-hidden
            className="absolute inset-y-0 rounded-full bg-accent-soft"
            style={{
              left: `${pctOf(band.lowGrams)}%`,
              width: `${pctOf(band.highGrams) - pctOf(band.lowGrams)}%`,
            }}
          />
        ) : null}

        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", series.bar)}
          style={{ width: `${pctOf(grams)}%` }}
        />

        {floor ? (
          <div
            aria-hidden
            title={`${rda ? "RDA" : "AI"} ${formatAmount(floor.value, meta.unit, "simple")}`}
            className="absolute inset-y-0 w-0.5 bg-ink/45"
            style={{ left: `${pctOf(floor.value)}%` }}
          />
        ) : null}
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-faint">
        {band ? (
          <>
            {band.lowPct}–{band.highPct}% of energy — {Math.round(band.lowGrams)}–
            {Math.round(band.highGrams)} {meta.unit} at today&apos;s{" "}
            {Math.round(energyConsumed).toLocaleString()} kcal
            {inBand === false ? (
              <span className="text-muted">
                {" "}
                · you are {grams < band.lowGrams ? "below" : "above"} it
              </span>
            ) : null}
          </>
        ) : null}
        {floor ? (
          <>
            {band ? " · " : ""}
            {rda ? "RDA" : "AI"} {formatAmount(floor.value, meta.unit, "simple")}
          </>
        ) : null}
        {!band && !floor ? "No reference intake published" : null}
      </p>

      <ExpertOnly>
        {amdr ? (
          <p className="mt-1 text-[11px] leading-relaxed text-faint">{amdr.note}</p>
        ) : null}
      </ExpertOnly>

      {isExpert && floor ? (
        <p className="numeric mt-0.5 text-[11px] text-faint">{floor.key}</p>
      ) : null}
    </div>
  );
}
