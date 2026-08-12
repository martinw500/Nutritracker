import { describe, expect, it } from "vitest";
import { coverage, isMissing, scaleVector, sumVectors } from "./scale";

describe("scaleVector", () => {
  it("scales a per-100g vector to a real quantity", () => {
    // Chicken breast, grilled: 31 g protein per 100 g.
    const scaled = scaleVector({ protein: 31, energy: 165 }, 150);
    expect(scaled.protein).toBeCloseTo(46.5, 10);
    expect(scaled.energy).toBeCloseTo(247.5, 10);
  });

  it("is the identity at 100 g", () => {
    expect(scaleVector({ magnesium: 177 }, 100).magnesium).toBe(177);
  });

  it("keeps a measured zero as zero", () => {
    const scaled = scaleVector({ flavones: 0 }, 80);
    expect(scaled.flavones).toBe(0);
    expect(isMissing(scaled, "flavones")).toBe(false);
  });

  it("does not invent keys that were absent", () => {
    const scaled = scaleVector({ protein: 31 }, 150);
    expect("lycopene" in scaled).toBe(false);
    expect(isMissing(scaled, "lycopene")).toBe(true);
  });
});

describe("sumVectors", () => {
  it("adds values present in more than one vector", () => {
    const { totals } = sumVectors([{ magnesium: 100 }, { magnesium: 50 }]);
    expect(totals.magnesium).toBe(150);
  });

  it("keeps a nutrient absent when no vector carried it", () => {
    const { totals } = sumVectors([{ protein: 10 }, { protein: 5 }]);
    expect("lycopene" in totals).toBe(false);
  });

  it("counts contributors so a total can be qualified", () => {
    const { contributors, vectorCount } = sumVectors([
      { magnesium: 100, lycopene: 2 },
      { magnesium: 50 },
      { magnesium: 25 },
    ]);
    expect(contributors.magnesium).toBe(3);
    expect(contributors.lycopene).toBe(1);
    expect(vectorCount).toBe(3);
  });

  it("distinguishes a measured zero from an absent value", () => {
    const { totals, contributors } = sumVectors([{ flavones: 0 }, { protein: 10 }]);
    expect(totals.flavones).toBe(0);
    expect(contributors.flavones).toBe(1);
    expect(isMissing(totals, "flavones")).toBe(false);
    expect(isMissing(totals, "flavonols")).toBe(true);
  });

  it("handles an empty day", () => {
    const { totals, vectorCount } = sumVectors([]);
    expect(Object.keys(totals)).toHaveLength(0);
    expect(vectorCount).toBe(0);
  });
});

describe("coverage", () => {
  const phyto = ["lutein-zeaxanthin", "flavonols", "lycopene"];

  it("counts a vector as covered if it carries any of the ids", () => {
    expect(coverage([{ flavonols: 6.5 }, { protein: 10 }], phyto)).toBe(0.5);
  });

  it("counts a measured zero as coverage", () => {
    // "We looked and it contains none" is data. It is not the same as a gap.
    expect(coverage([{ lycopene: 0 }], phyto)).toBe(1);
  });

  it("is zero for an empty day rather than NaN", () => {
    expect(coverage([], phyto)).toBe(0);
  });
});
