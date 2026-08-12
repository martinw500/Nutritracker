/**
 * "No data" is a real, common answer — not an error state and not a zero.
 *
 * USDA's flavonoid databases cover roughly 500 foods; FoodData Central holds
 * 600,000. Most logged meals will have no phytonutrient data at all. Rendering
 * that gap as `0` produces charts that are alarming and wrong, so the gap gets
 * its own visual language: dashed, grey, and never counted into a total.
 * CLAUDE.md rule 5.
 */

export function NoDataChip({ reason }: { reason?: string }) {
  return (
    <span
      title={reason ?? "No data for this nutrient in the foods logged"}
      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-nodata px-1.5 py-0.5 text-[11px] text-nodata"
    >
      no data
    </span>
  );
}

/**
 * Shown next to a total that only some of the day's foods contributed to.
 * A 4.2 mg total built from 2 of 12 foods is a much weaker claim than one
 * built from 12 of 12, and the difference is worth a line of text.
 */
export function PartialDataNote({
  contributors,
  entryCount,
}: {
  contributors: number;
  entryCount: number;
}) {
  if (contributors >= entryCount) return null;
  return (
    <span className="text-[11px] text-faint">
      from {contributors} of {entryCount} items
    </span>
  );
}
