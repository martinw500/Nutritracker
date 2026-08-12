/**
 * The rendering guarantees, asserted rather than assumed.
 *
 * The type system already stops a phytonutrient reaching `TargetBar`. These
 * tests cover the other half: that the row a user actually sees never grows a
 * percentage, and that a missing value never renders as a zero. Both are
 * failures that would look completely plausible on screen.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailLevelProvider } from "./detail-level";
import { NutrientRow } from "./nutrient-row";
import { getTracked } from "@/lib/nutrition/roster";
import type { DetailLevel } from "@/lib/nutrition/format";

const person = { sex: "male", ageYears: 28, pregnancyStatus: "none" } as const;

function renderRow(
  id: string,
  amount: number | undefined,
  detail: DetailLevel = "simple",
) {
  const tracked = getTracked(id);
  if (!tracked) throw new Error(`${id} is not in the roster`);

  return render(
    <DetailLevelProvider initial={detail}>
      <NutrientRow
        tracked={tracked}
        amount={amount}
        contributors={2}
        entryCount={12}
        person={person}
        series={[1.2, 3.4, 2.1, 11.4]}
      />
    </DetailLevelProvider>,
  );
}

describe("Tier 3 rows never imply a target", () => {
  for (const detail of ["simple", "expert"] as const) {
    it(`renders no percentage in ${detail} mode`, () => {
      const { container } = renderRow("lutein-zeaxanthin", 11.4, detail);
      expect(container.textContent).not.toMatch(/\d\s*%/);
    });

    it(`renders no progress bar in ${detail} mode`, () => {
      renderRow("lutein-zeaxanthin", 11.4, detail);
      expect(screen.queryByRole("meter")).toBeNull();
      expect(screen.queryByRole("progressbar")).toBeNull();
    });
  }

  it("shows the absolute amount and frames the population median as context", () => {
    const { container } = renderRow("lutein-zeaxanthin", 11.4);
    expect(container.textContent).toContain("11.4 mg");
    expect(container.textContent).toContain("No reference intake exists");
    expect(container.textContent).not.toContain("target");
  });
});

describe("Tier 2 rows do show a target", () => {
  it("renders a meter and a percentage", () => {
    const { container } = renderRow("magnesium", 492);
    expect(screen.getByRole("meter")).toBeTruthy();
    expect(container.textContent).toMatch(/\d+%/);
  });

  it("does not report an excess when the UL is supplements-only", () => {
    const { container } = renderRow("magnesium", 492);
    expect(container.textContent).toContain("Not flagged");
  });
});

describe("missing is not zero", () => {
  it("renders 'no data' rather than 0 when nothing carried a value", () => {
    const { container } = renderRow("lycopene", undefined);
    expect(container.textContent).toContain("no data");
    expect(container.textContent).not.toMatch(/\b0(\.0+)?\s*mg\b/);
  });

  it("renders a measured zero as zero, not as 'no data'", () => {
    const { container } = renderRow("lycopene", 0);
    expect(container.textContent).toContain("0 mg");
    expect(container.textContent).not.toContain("no data");
  });
});

describe("nutrients without a written reference panel", () => {
  it("shows the amount but no target, and says why", () => {
    const { container } = renderRow("energy", 1721);
    expect(container.textContent).toContain("1721 kcal");
    expect(container.textContent).toContain("no reference yet");
    expect(screen.queryByRole("meter")).toBeNull();
  });
});

describe("brief entries", () => {
  it("render a real target, exactly like a full entry", () => {
    // Calcium is depth: brief — a cited RDA with the prose still to come.
    // 583 mg against a 1000 mg RDA is 58%.
    const { container } = renderRow("calcium", 583);
    expect(screen.getByRole("meter")).toBeTruthy();
    expect(container.textContent).toMatch(/58%/);
    expect(container.textContent).toContain("583 mg");
  });

  it("show their one-liner, since that is the prose they have", () => {
    const { container } = renderRow("calcium", 583);
    expect(container.textContent).toContain("Builds the skeleton");
  });
});

describe("expert mode is a superset, not a replacement", () => {
  it("keeps everything simple mode showed and adds to it", () => {
    const simple = renderRow("magnesium", 492, "simple").container.textContent ?? "";
    const expert = renderRow("magnesium", 492, "expert").container.textContent ?? "";

    expect(expert).toContain("Magnesium");
    expect(expert.length).toBeGreaterThan(simple.length);
    // The expert-only detail: which reference, which life-stage band, which UL.
    expect(expert).toContain("male_19_30");
    expect(expert).toContain("RDA");
  });
});
