import { describe, expect, it } from "vitest";
import { alertWindowDays, computeStatus } from "./status";
import { detectDeficiency } from "./rollup";
import type { ReferenceNutrient } from "./types";

const person = { sex: "male", ageYears: 28, pregnancyStatus: "none" } as const;

/** Only the fields computeStatus reads. */
function referenceNutrient(reference: ReferenceNutrient["reference"]): ReferenceNutrient {
  return { hasReferenceIntake: true, reference } as ReferenceNutrient;
}

const magnesium = referenceNutrient({
  ear: { male_19_30: 330 },
  rda: { male_19_30: 400, male_31_plus: 420 },
  ai: null,
  ul: {
    value: 350,
    appliesTo: "supplemental",
    note: "Applies to supplemental magnesium only. Dietary magnesium has no UL.",
    byLifeStage: undefined,
  },
});

const vitaminC = referenceNutrient({
  ear: null,
  rda: { male_19_30: 90 },
  ai: null,
  ul: { value: 2000, appliesTo: "total", note: null },
});

/** A nutrient with an AI and no RDA — the vitamin K / choline shape. */
const aiOnly = referenceNutrient({
  ear: null,
  rda: null,
  ai: { male_19_30: 120 },
  ul: null,
});

describe("computeStatus bands", () => {
  it("reports below 70% of target as low", () => {
    const status = computeStatus(vitaminC, 57.2, person);
    expect(status.band).toBe("low");
    expect(status.pct).toBeCloseTo(63.6, 1);
  });

  it("reports 70–99% as below target, not low", () => {
    expect(computeStatus(vitaminC, 63, person).band).toBe("below-target");
    expect(computeStatus(vitaminC, 89, person).band).toBe("below-target");
  });

  it("treats exactly 70% as below target", () => {
    expect(computeStatus(vitaminC, 63, person).pct).toBe(70);
    expect(computeStatus(vitaminC, 63, person).band).toBe("below-target");
  });

  it("reports the target as met at 100%", () => {
    expect(computeStatus(vitaminC, 90, person).band).toBe("met");
  });

  it("names which reference the target came from", () => {
    expect(computeStatus(vitaminC, 90, person).targetKind).toBe("rda");
    expect(computeStatus(aiOnly, 120, person).targetKind).toBe("ai");
  });

  it("reports the life-stage key it matched", () => {
    expect(computeStatus(magnesium, 400, person).lifeStageKey).toBe("male_19_30");
  });
});

describe("computeStatus and upper limits", () => {
  it("flags intake above a UL that applies to total intake", () => {
    expect(computeStatus(vitaminC, 2400, person).band).toBe("over-ul");
  });

  it("does NOT flag a dietary intake above a supplements-only UL", () => {
    // 492 mg of dietary magnesium against a 350 mg supplemental ceiling. This
    // is a good day of eating, not an excess. Flagging it would fire on almost
    // every well-fed day.
    const status = computeStatus(magnesium, 492, person);
    expect(status.band).toBe("met");
    expect(status.ulNotApplicable).toBe(true);
  });

  it("says why the limit was not applied, rather than staying silent", () => {
    expect(computeStatus(magnesium, 492, person).ulAppliesTo).toBe("supplemental");
  });

  it("does not set ulNotApplicable when intake is under the limit anyway", () => {
    expect(computeStatus(magnesium, 300, person).ulNotApplicable).toBe(false);
  });

  it("prefers a life-stage UL override over the headline value", () => {
    const withOverride = referenceNutrient({
      ear: null,
      rda: { male_19_30: 90 },
      ai: null,
      ul: {
        value: 2000,
        appliesTo: "total",
        note: null,
        byLifeStage: { male_19_30: 1800 },
      },
    });
    const status = computeStatus(withOverride, 1900, person);
    expect(status.ul).toBe(1800);
    expect(status.band).toBe("over-ul");
  });
});

describe("computeStatus with no reference for this person", () => {
  const adultOnly = referenceNutrient({
    ear: null,
    rda: { male_19_30: 400 },
    ai: null,
    ul: null,
  });

  it("returns a null percentage rather than inventing a target", () => {
    const child = { sex: "male", ageYears: 6, pregnancyStatus: "none" } as const;
    const status = computeStatus(adultOnly, 200, child);
    expect(status.pct).toBeNull();
    expect(status.target).toBeNull();
  });
});

describe("alert windows scale with storage class", () => {
  it("maps each storage class to its window", () => {
    expect(alertWindowDays("none")).toBe(3);
    expect(alertWindowDays("moderate")).toBe(7);
    expect(alertWindowDays("high")).toBe(30);
  });
});

describe("detectDeficiency", () => {
  const series = (values: number[]) =>
    values.map((value, index) => ({ date: `2026-08-${index + 1}`, value }));

  it("fires for an unstored nutrient after 3 consecutive short days", () => {
    // Vitamin C, RDA 90, threshold 63.
    const result = detectDeficiency(series([95, 88, 48, 55, 57]), 90, "none");
    expect(result.consecutiveDaysBelow).toBe(3);
    expect(result.firing).toBe(true);
  });

  it("does not fire for an unstored nutrient on 2 short days", () => {
    const result = detectDeficiency(series([95, 88, 91, 55, 57]), 90, "none");
    expect(result.consecutiveDaysBelow).toBe(2);
    expect(result.firing).toBe(false);
  });

  it("fires for a stored nutrient on the 30-day mean, not on any single day", () => {
    // Vitamin D, RDA 15, threshold 10.5. No single day looks alarming enough
    // to warrant an alert, but the month averages half the target.
    const month = series(Array.from({ length: 30 }, (_, i) => (i % 7 === 0 ? 16 : 5.2)));
    const result = detectDeficiency(month, 15, "high");
    expect(result.windowDays).toBe(30);
    expect(result.firing).toBe(true);
    expect(result.consecutiveDaysBelow).toBeLessThan(3);
  });

  it("does not fire on a 7-day mean that is adequate despite a bad day", () => {
    // Magnesium, RDA 400, threshold 280. One short day inside a good week.
    const result = detectDeficiency(series([430, 465, 200, 502, 411, 448, 492]), 400, "moderate");
    expect(result.windowDays).toBe(7);
    expect(result.firing).toBe(false);
  });

  it("only looks at the trailing window, not the whole history", () => {
    // A dire fortnight followed by a good week must not keep firing.
    const values = [...Array(14).fill(100), ...Array(7).fill(500)];
    const result = detectDeficiency(series(values), 400, "moderate");
    expect(result.windowMean).toBe(500);
    expect(result.firing).toBe(false);
  });

  it("handles an empty series without firing", () => {
    expect(detectDeficiency([], 400, "moderate").firing).toBe(false);
  });
});
