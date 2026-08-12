"use client";

/**
 * The hero figure.
 *
 * The ring is in the chrome accent, not a status colour: eating 69% of your
 * estimated energy by mid-evening is neither good nor bad, and colouring it
 * green or red would assert a judgement the data does not support.
 *
 * The number it is measured against is an ESTIMATE from an equation, not a
 * reference intake — there is no RDA for calories. The wording says so, and
 * expert mode shows the equation and the ±10% band.
 */

import { ExpertOnly, useDetailLevel } from "@/components/detail-level";
import { Card } from "@/components/ui";
import type { EnergyEstimate } from "@/lib/nutrition/energy";

export function EnergyRing({
  consumed,
  estimate,
}: {
  consumed: number;
  estimate: EnergyEstimate;
}) {
  const { detail } = useDetailLevel();
  const pct = (consumed / estimate.estimatedNeed) * 100;
  const remaining = estimate.estimatedNeed - consumed;

  const size = 132;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(pct, 100) / 100) * circumference;

  return (
    <Card className="flex flex-wrap items-center gap-6 sm:gap-8">
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="meter"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${Math.round(pct)}% of estimated energy need`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-sunken)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="hero-figure text-2xl font-semibold text-ink">
            {Math.round(pct)}%
          </span>
          <span className="text-[11px] text-faint">of need</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="hero-figure text-[2.75rem] font-semibold text-ink sm:text-5xl">
          {Math.round(consumed).toLocaleString()}
          <span className="ml-2 text-base font-normal text-muted">kcal</span>
        </p>

        <p className="mt-1 text-sm text-muted">
          {remaining > 0 ? (
            <>
              <span className="text-ink">{Math.round(remaining).toLocaleString()} left</span>{" "}
              of an estimated {Math.round(estimate.estimatedNeed).toLocaleString()} need
            </>
          ) : (
            <>
              <span className="text-ink">
                {Math.abs(Math.round(remaining)).toLocaleString()} over
              </span>{" "}
              an estimated {Math.round(estimate.estimatedNeed).toLocaleString()} need
            </>
          )}
        </p>

        <p className="mt-2 text-xs leading-relaxed text-faint">
          An estimate, not a reference intake — there is no RDA for calories.
          Realistically {Math.round(estimate.range.low).toLocaleString()}–
          {Math.round(estimate.range.high).toLocaleString()} kcal.
        </p>

        <ExpertOnly>
          <p className="numeric mt-2 text-[11px] text-faint">
            {estimate.equation} · BMR {Math.round(estimate.bmr).toLocaleString()} kcal ·
            predicts measured resting expenditure within 10% for roughly 4 people in 5
            {detail === "expert" ? "" : ""}
          </p>
        </ExpertOnly>
      </div>
    </Card>
  );
}
