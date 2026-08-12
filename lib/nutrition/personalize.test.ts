import { describe, expect, it } from "vitest";
import {
  ageFromBirthDate,
  candidateGroups,
  parseLifeStageKey,
  resolveReference,
} from "./personalize";

const male28 = { sex: "male", ageYears: 28, pregnancyStatus: "none" } as const;
const male31 = { sex: "male", ageYears: 31, pregnancyStatus: "none" } as const;
const female55 = { sex: "female", ageYears: 55, pregnancyStatus: "none" } as const;
const child7 = { sex: "female", ageYears: 7, pregnancyStatus: "none" } as const;
const child11 = { sex: "male", ageYears: 11, pregnancyStatus: "none" } as const;
const pregnant25 = { sex: "female", ageYears: 25, pregnancyStatus: "pregnant" } as const;
const lactating25 = { sex: "female", ageYears: 25, pregnancyStatus: "lactating" } as const;

describe("parseLifeStageKey", () => {
  it("parses a closed band", () => {
    expect(parseLifeStageKey("male_19_30")).toEqual({ group: "male", low: 19, high: 30 });
  });

  it("treats `plus` as open-ended", () => {
    expect(parseLifeStageKey("female_71_plus")?.high).toBe(Number.POSITIVE_INFINITY);
  });

  it("rejects anything that is not a life-stage key", () => {
    expect(parseLifeStageKey("supplemental")).toBeNull();
    expect(parseLifeStageKey("male_19")).toBeNull();
  });
});

describe("candidateGroups", () => {
  it("uses sex-neutral child groups below 9", () => {
    expect(candidateGroups(child7)).toEqual(["child"]);
  });

  it("allows either child or sex-specific banding from 9 upward", () => {
    expect(candidateGroups(child11)).toEqual(["male", "child"]);
  });

  it("lets pregnancy and lactation override sex entirely", () => {
    expect(candidateGroups(pregnant25)).toEqual(["pregnancy"]);
    expect(candidateGroups(lactating25)).toEqual(["lactation"]);
  });
});

describe("resolveReference", () => {
  // Magnesium's real banding.
  const magnesium = {
    child_1_3: 80,
    child_4_8: 130,
    child_9_13: 240,
    male_14_18: 410,
    male_19_30: 400,
    male_31_plus: 420,
    female_19_30: 310,
    female_31_plus: 320,
  };

  it("picks the band containing the person", () => {
    expect(resolveReference(magnesium, male28)).toEqual({ key: "male_19_30", value: 400 });
  });

  it("crosses an age boundary correctly", () => {
    // 30 → 31 must move from 400 to 420. This is the off-by-one that silently
    // produces plausible-looking wrong targets.
    expect(resolveReference(magnesium, { ...male28, ageYears: 30 })?.value).toBe(400);
    expect(resolveReference(magnesium, male31)?.value).toBe(420);
  });

  it("resolves an open-ended upper band", () => {
    expect(resolveReference(magnesium, female55)).toEqual({
      key: "female_31_plus",
      value: 320,
    });
  });

  it("separates the sexes at the same age", () => {
    expect(resolveReference(magnesium, male28)?.value).toBe(400);
    expect(resolveReference(magnesium, { ...male28, sex: "female" })?.value).toBe(310);
  });

  it("uses child bands below 9 without needing a sex", () => {
    expect(resolveReference(magnesium, child7)).toEqual({ key: "child_4_8", value: 130 });
  });

  it("prefers the narrower band when two overlap", () => {
    const overlapping = { male_19_plus: 100, male_19_30: 90 };
    expect(resolveReference(overlapping, male28)?.value).toBe(90);
  });

  it("prefers the sex-specific band over a sex-neutral one that also matches", () => {
    const overlapping = { child_9_13: 240, male_9_13: 200 };
    expect(resolveReference(overlapping, child11)?.value).toBe(200);
  });

  it("returns null when no band covers the person", () => {
    // Infant groups are deliberately absent from the data.
    expect(resolveReference(magnesium, { ...child7, ageYears: 0 })).toBeNull();
  });

  it("returns null for an absent table rather than throwing", () => {
    expect(resolveReference(null, male28)).toBeNull();
    expect(resolveReference(undefined, male28)).toBeNull();
  });

  it("ignores non-life-stage keys mixed into a table", () => {
    expect(resolveReference({ ...magnesium, supplemental: 350 }, male28)?.value).toBe(400);
  });
});

describe("ageFromBirthDate", () => {
  it("counts a birthday that has already passed", () => {
    expect(ageFromBirthDate("1998-04-12", new Date("2026-08-11T12:00:00"))).toBe(28);
  });

  it("does not count a birthday still to come this year", () => {
    expect(ageFromBirthDate("1998-12-12", new Date("2026-08-11T12:00:00"))).toBe(27);
  });

  it("counts the birthday itself", () => {
    expect(ageFromBirthDate("1998-08-11", new Date("2026-08-11T12:00:00"))).toBe(28);
  });
});
