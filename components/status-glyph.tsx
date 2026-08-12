/**
 * The second channel.
 *
 * Status colour cannot carry meaning on its own here: measured against the
 * validator, the "met" green and the "over limit" red sit ΔE 4.1 apart under
 * deuteranopia, and "under target" amber against "low" orange sit 13.6 apart
 * even in full colour — below the 15 floor at which a pair is reliably
 * distinguishable.
 *
 * So every state also gets a distinct SHAPE, and every tile carries the state
 * in words in its title. Shape is doing real work here; it is not decoration.
 *
 *   met           filled disc
 *   below-target  half-filled disc
 *   low           hollow ring
 *   over-ul       filled square, rotated — the only angular shape
 *   no-target     small diamond, neutral
 *   no-data       dashed outline
 *   no-reference  dotted outline
 */

import type { TileState } from "@/lib/nutrition/tile-state";
import { cn } from "@/lib/utils";

export function StatusGlyph({
  state,
  size = 14,
  className,
}: {
  state: TileState;
  size?: number;
  className?: string;
}) {
  const c = size / 2;
  const r = size / 2 - 1.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className={cn("shrink-0", className)}
    >
      {state === "met" ? (
        <circle cx={c} cy={c} r={r} fill="currentColor" />
      ) : null}

      {state === "below-target" ? (
        <>
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d={`M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} Z`}
            fill="currentColor"
          />
        </>
      ) : null}

      {state === "low" ? (
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        />
      ) : null}

      {state === "over-ul" ? (
        <rect
          x={c - r * 0.72}
          y={c - r * 0.72}
          width={r * 1.44}
          height={r * 1.44}
          rx="1"
          fill="currentColor"
          transform={`rotate(45 ${c} ${c})`}
        />
      ) : null}

      {state === "no-target" ? (
        <rect
          x={c - r * 0.55}
          y={c - r * 0.55}
          width={r * 1.1}
          height={r * 1.1}
          fill="currentColor"
          transform={`rotate(45 ${c} ${c})`}
        />
      ) : null}

      {state === "no-data" ? (
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="2.5 2"
        />
      ) : null}

      {state === "no-reference" ? (
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="0.5 2.5"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
