"use client";

/**
 * A single headline number. Not a chart — a one-bar bar chart is a stat tile
 * that took a wrong turn.
 *
 * The value uses proportional figures: equal-width digits make a large standalone
 * number look loose. Tabular figures are for columns that align vertically.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  unit,
  note,
  series,
  href,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  series?: readonly number[];
  href?: string;
  tone?: "neutral" | "accent" | "met" | "low";
}) {
  const toneText = {
    neutral: "text-ink",
    accent: "text-accent",
    met: "text-met",
    low: "text-low",
  }[tone];

  const body = (
    <>
      <p className="text-[11px] uppercase tracking-[0.06em] text-faint">{label}</p>

      <div className="mt-1 flex items-end justify-between gap-2">
        <p className={cn("hero-figure text-xl font-semibold", toneText)}>
          {value}
          {unit ? <span className="ml-1 text-xs font-normal text-muted">{unit}</span> : null}
        </p>
        {series && series.length > 1 ? (
          <Sparkline values={series} width={54} height={18} label={`${label} trend`} />
        ) : null}
      </div>

      {note ? <p className="mt-1 text-[11px] leading-snug text-faint">{note}</p> : null}
    </>
  );

  const className = cn(
    "block rounded-card border border-border bg-surface p-4",
    href && "transition-colors hover:bg-sunken",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
