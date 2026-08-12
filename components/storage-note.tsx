/**
 * States the window an alert is judged over, and why it is that long.
 *
 * A one-day B12 shortfall is noise — the liver holds years of it. Most trackers
 * that attempt deficiency warnings fire daily against the RDA, produce constant
 * false alarms, and get their notifications switched off within a week. Showing
 * the window next to the alert is what makes the alert believable.
 * CLAUDE.md rule 7.
 */

import { Badge } from "@/components/ui";
import type { StorageClass } from "@/lib/nutrition/types";

const WHY: Record<StorageClass, string> = {
  none: "Water-soluble and not stored, so a short run of days is the signal.",
  moderate: "Days to weeks of reserve, so single days mean little.",
  high: "Months to years of reserve, so only a sustained trend is meaningful.",
};

const WINDOW: Record<StorageClass, string> = {
  none: "3-day window",
  moderate: "7-day average",
  high: "30-day average",
};

export function StorageBadge({ storage }: { storage: StorageClass }) {
  return (
    <Badge tone="quiet" title={WHY[storage]}>
      {WINDOW[storage]}
    </Badge>
  );
}

export function StorageNote({ storage }: { storage: StorageClass }) {
  return (
    <p className="text-xs leading-relaxed text-muted">
      <span className="text-ink">{WINDOW[storage]}.</span> {WHY[storage]}
    </p>
  );
}
