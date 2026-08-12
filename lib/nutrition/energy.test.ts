import { describe, expect, it } from "vitest";
import {
  ACTIVITY_FACTORS,
  basalMetabolicRate,
  estimateEnergyNeed,
  macroRangeGrams,
  percentOfEnergy,
} from "./energy";

const man = {
  sex: "male",
  ageYears: 28,
  weightKg: 74,
  heightCm: 179,
} as const;

const woman = {
  sex: "female",
  ageYears: 28,
  weightKg: 62,
  heightCm: 165,
} as const;

describe("basalMetabolicRate", () => {
  it("matches Mifflin-St Jeor worked by hand for a man", () => {
    // 10(74) + 6.25(179) − 5(28) + 5 = 740 + 1118.75 − 140 + 5
    expect(basalMetabolicRate(man)).toBeCloseTo(1723.75, 6);
  });

  it("matches Mifflin-St Jeor worked by hand for a woman", () => {
    // 10(62) + 6.25(165) − 5(28) − 161 = 620 + 1031.25 − 140 − 161
    expect(basalMetabolicRate(woman)).toBeCloseTo(1350.25, 6);
  });

  it("applies a 166 kcal sex offset and nothing else", () => {
    const asMale = basalMetabolicRate({ ...woman, sex: "male" });
    expect(asMale - basalMetabolicRate(woman)).toBeCloseTo(166, 6);
  });

  it("falls by 5 kcal per year of age", () => {
    const older = basalMetabolicRate({ ...man, ageYears: 29 });
    expect(basalMetabolicRate(man) - older).toBeCloseTo(5, 6);
  });

  it("rises by 10 kcal per kg of bodyweight", () => {
    const heavier = basalMetabolicRate({ ...man, weightKg: 75 });
    expect(heavier - basalMetabolicRate(man)).toBeCloseTo(10, 6);
  });
});

describe("estimateEnergyNeed", () => {
  it("multiplies BMR by the activity factor", () => {
    const estimate = estimateEnergyNeed({ ...man, activityLevel: "moderate" });
    expect(estimate.activityFactor).toBe(1.55);
    expect(estimate.estimatedNeed).toBeCloseTo(1723.75 * 1.55, 6);
  });

  it("orders the activity factors from sedentary to very active", () => {
    const levels = ["sedentary", "light", "moderate", "active", "very-active"] as const;
    const needs = levels.map(
      (activityLevel) => estimateEnergyNeed({ ...man, activityLevel }).estimatedNeed,
    );
    for (let i = 1; i < needs.length; i += 1) {
      expect(needs[i]).toBeGreaterThan(needs[i - 1]);
    }
  });

  it("reports a ±10% band, because the equation is an estimate", () => {
    const estimate = estimateEnergyNeed({ ...man, activityLevel: "sedentary" });
    expect(estimate.range.low).toBeCloseTo(estimate.estimatedNeed * 0.9, 6);
    expect(estimate.range.high).toBeCloseTo(estimate.estimatedNeed * 1.1, 6);
  });

  it("names the equation, so the UI never presents the figure bare", () => {
    const estimate = estimateEnergyNeed({ ...man, activityLevel: "active" });
    expect(estimate.equation).toContain("Mifflin-St Jeor");
    expect(estimate.equation).toContain(String(ACTIVITY_FACTORS.active));
  });
});

describe("macroRangeGrams", () => {
  const energy = 2000;

  it("converts a fat AMDR of 20–35% of energy into grams at 9 kcal/g", () => {
    const range = macroRangeGrams("fat-total", { lowPct: 20, highPct: 35 }, energy);
    expect(range?.lowGrams).toBeCloseTo((2000 * 0.2) / 9, 6);
    expect(range?.highGrams).toBeCloseTo((2000 * 0.35) / 9, 6);
  });

  it("uses 4 kcal/g for carbohydrate and protein", () => {
    const carb = macroRangeGrams("carbohydrate", { lowPct: 45, highPct: 65 }, energy);
    expect(carb?.lowGrams).toBeCloseTo(225, 6);
    expect(carb?.highGrams).toBeCloseTo(325, 6);
  });

  it("returns a band, never a single collapsed number", () => {
    const range = macroRangeGrams("protein", { lowPct: 10, highPct: 35 }, energy);
    expect(range!.highGrams).toBeGreaterThan(range!.lowGrams);
  });

  it("returns null for a nutrient with no energy yield", () => {
    expect(macroRangeGrams("magnesium", { lowPct: 10, highPct: 35 }, energy)).toBeNull();
  });
});

describe("percentOfEnergy", () => {
  it("computes the share of energy a macronutrient supplied", () => {
    // 124 g protein × 4 kcal = 496 kcal of a 1721 kcal day.
    expect(percentOfEnergy("protein", 124, 1721)).toBeCloseTo((496 / 1721) * 100, 6);
  });

  it("returns null rather than dividing by zero on an empty day", () => {
    expect(percentOfEnergy("protein", 0, 0)).toBeNull();
  });

  it("returns null for a nutrient that carries no energy", () => {
    expect(percentOfEnergy("water", 2000, 1721)).toBeNull();
  });
});
