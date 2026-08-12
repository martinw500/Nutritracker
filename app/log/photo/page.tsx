"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Eye, Database, TriangleAlert } from "lucide-react";
import { ExpertOnly, useDetailLevel } from "@/components/detail-level";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardHeader, Note } from "@/components/ui";
import { getFood, getPhotoDraft, type DraftItem } from "@/lib/demo";
import { formatAmount } from "@/lib/nutrition/format";
import { rollUpDay } from "@/lib/nutrition/rollup";
import { scaleVector } from "@/lib/nutrition/scale";

const LOW_CONFIDENCE = 0.75;

export default function PhotoDraftPage() {
  const draft = getPhotoDraft();
  const { detail } = useDetailLevel();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(draft.items.map((item) => [item.id, item.quantity])),
  );
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const active = draft.items.filter((item) => !removed.has(item.id));

  // Totals are computed from the RESOLVED FOODS, never from the model output.
  const rollup = useMemo(() => {
    const items = active.flatMap((item) => {
      const food = getFood(item.resolvedFoodId);
      if (!food) return [];
      const grams = quantities[item.id] ?? item.quantity;
      return [
        {
          vector: scaleVector(food.nutrients, grams),
          phyto: food.phytonutrients ? scaleVector(food.phytonutrients, grams) : null,
          plantSpecies: food.plantSpecies,
          glycemicLoad: food.glPer100g === null ? null : (food.glPer100g * grams) / 100,
          meal: "lunch",
        },
      ];
    });
    return rollUpDay(items);
  }, [active, quantities]);

  const lowConfidence = active.filter((item) => item.confidence < LOW_CONFIDENCE);

  return (
    <div className="space-y-6">
      <Link
        href="/log"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Back to log
      </Link>

      <PageHeader
        title="Review this draft"
        subtitle="Nothing is logged until you confirm. Every item is editable, and the quantities are the part most worth checking — identification is the reliable half of this, portion estimation is not."
      />

      <SplitExplainer model={draft.model} costUsd={draft.costUsd} cached={draft.promptCached} />

      {draft.sceneNotes ? (
        <Note tone="warn">
          <span className="font-medium">What the model noticed about the photo: </span>
          {draft.sceneNotes}
        </Note>
      ) : null}

      {lowConfidence.length > 0 ? (
        <Note tone="warn">
          <TriangleAlert className="mr-1.5 inline size-3.5 align-[-2px]" />
          {lowConfidence.length} item{lowConfidence.length > 1 ? "s are" : " is"} low
          confidence. Check {lowConfidence.length > 1 ? "them" : "it"} before confirming.
        </Note>
      ) : null}

      <div className="space-y-4">
        {draft.items.map((item) => (
          <DraftItemCard
            key={item.id}
            item={item}
            grams={quantities[item.id] ?? item.quantity}
            removed={removed.has(item.id)}
            onQuantity={(grams) =>
              setQuantities((current) => ({ ...current, [item.id]: grams }))
            }
            onToggleRemoved={() =>
              setRemoved((current) => {
                const next = new Set(current);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                return next;
              })
            }
          />
        ))}
      </div>

      <Card>
        <CardHeader
          title="What this adds to your day"
          subtitle="Every figure here comes from the resolved food's row in the database, scaled by the quantity above."
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { id: "energy", label: "Energy", unit: "kcal" },
            { id: "protein", label: "Protein", unit: "g" },
            { id: "magnesium", label: "Magnesium", unit: "mg" },
            { id: "vitamin-c", label: "Vitamin C", unit: "mg" },
          ].map((cell) => (
            <div key={cell.id}>
              <p className="text-[11px] uppercase tracking-wide text-faint">
                {cell.label}
              </p>
              <p className="numeric mt-1 text-lg text-ink">
                {rollup.totals[cell.id] === undefined
                  ? "—"
                  : formatAmount(rollup.totals[cell.id], cell.unit, detail)}
              </p>
            </div>
          ))}
        </div>
        <ExpertOnly>
          <p className="numeric mt-4 border-t border-border pt-3 text-[11px] text-faint">
            glycemic load {rollup.glycemicLoad.toFixed(1)} · phytonutrient data for{" "}
            {rollup.phytoCoveredCount} of {rollup.entryCount} items ·{" "}
            {rollup.plantSpecies.length} plant species
          </p>
        </ExpertOnly>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled
          title="Not wired up — there is no database to write to yet."
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent opacity-60"
        >
          <Check className="size-4" strokeWidth={2.5} />
          Confirm {active.length} item{active.length === 1 ? "" : "s"}
        </button>
        <Link href="/log" className="text-sm text-muted hover:text-ink">
          Discard
        </Link>
      </div>

      <Note>
        Confirming is the only path from a draft to your log. There is deliberately no
        auto-accept, no matter how confident the model is — an AI suggestion is a draft
        until a person says otherwise.
      </Note>
    </div>
  );
}

/**
 * The split, stated on the screen where it matters most. A user looking at
 * AI-generated food identification deserves to know exactly which numbers came
 * from the model (none of them) and which came from the database (all of them).
 */
function SplitExplainer({
  model,
  costUsd,
  cached,
}: {
  model: string;
  costUsd: number;
  cached: boolean;
}) {
  return (
    <Card className="!bg-sunken">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink">
            <Eye className="size-3.5" strokeWidth={2} />
            The model decided
          </p>
          <p className="text-xs leading-relaxed text-muted">
            Which foods are in the photo, roughly how much of each, how it was prepared,
            and how sure it is. That is the whole list.
          </p>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink">
            <Database className="size-3.5" strokeWidth={2} />
            The database decided
          </p>
          <p className="text-xs leading-relaxed text-muted">
            Every nutrient value below. The model was never asked how much protein or
            magnesium anything contains — so a misidentification is visible and
            correctable rather than an invisible wrong number.
          </p>
        </div>
      </div>
      <ExpertOnly>
        <p className="numeric mt-4 border-t border-border pt-3 text-[11px] text-faint">
          {model} · ${costUsd.toFixed(4)} · system prompt{" "}
          {cached ? "served from cache" : "not cached"} · structured output, no prose
          parsing
        </p>
      </ExpertOnly>
    </Card>
  );
}

function DraftItemCard({
  item,
  grams,
  removed,
  onQuantity,
  onToggleRemoved,
}: {
  item: DraftItem;
  grams: number;
  removed: boolean;
  onQuantity: (grams: number) => void;
  onToggleRemoved: () => void;
}) {
  const { detail, isExpert } = useDetailLevel();
  const food = getFood(item.resolvedFoodId);
  const low = item.confidence < LOW_CONFIDENCE;
  const energy = food ? ((food.nutrients["energy"] ?? 0) * grams) / 100 : 0;

  return (
    <Card className={removed ? "opacity-50" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink">{item.description}</span>
            <Badge tone={low ? "low" : "quiet"}>
              {Math.round(item.confidence * 100)}% confident
            </Badge>
            <Badge tone="quiet">{item.preparation}</Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            <span className="text-faint">Judged size by:</span> {item.portionBasis}
          </p>
        </div>

        <button
          onClick={onToggleRemoved}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-ink"
        >
          {removed ? "Restore" : "Remove"}
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-sunken px-3 py-2.5">
        <p className="text-[11px] text-faint">Matched in the food database to</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink">{food?.name ?? "unresolved"}</span>
          {isExpert ? <Badge tone="quiet">via {item.resolverMethod}</Badge> : null}
        </div>
        {item.alternatives.length > 0 ? (
          <p className="mt-1.5 text-[11px] text-faint">
            Not right? {item.alternatives.join(" · ")}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`qty-${item.id}`} className="text-xs text-muted">
            Quantity
          </label>
          <span className="numeric text-sm text-ink">
            {grams} g
            <span className="ml-2 text-faint">
              {formatAmount(energy, "kcal", detail)}
            </span>
          </span>
        </div>
        <input
          id={`qty-${item.id}`}
          type="range"
          min={0}
          max={Math.max(300, item.quantity * 2)}
          step={5}
          value={grams}
          disabled={removed}
          onChange={(event) => onQuantity(Number(event.target.value))}
          className="mt-2 w-full accent-[var(--accent)]"
        />
        {grams !== item.quantity ? (
          <p className="mt-1 text-[11px] text-faint">
            Edited from the model&apos;s {item.quantity} g estimate.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
