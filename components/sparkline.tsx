/**
 * A trend with no target line, because Tier 3 has no target.
 *
 * This is what a phytonutrient gets instead of a progress bar: where the
 * amount has been going, in absolute units, with no implied "should".
 */

export function Sparkline({
  values,
  width = 72,
  height = 20,
  label,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  label?: string;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastValue = values[values.length - 1];
  const lastX = width;
  const lastY = height - ((lastValue - min) / span) * (height - 2) - 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? `Trend over the last ${values.length} days`}
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--ink-faint)"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="1.75" fill="var(--accent)" />
    </svg>
  );
}
