import { describe, expect, it } from "vitest";
import { getTracked } from "./roster";
import { resolveTile } from "./tile-state";

const person = { sex: "male", ageYears: 28, pregnancyStatus: "none" } as const;

/** The demo day's energy, so the gram bands match what the UI shows. */
const ENERGY = 1721;

function tile(id: string, amount: number | undefined, energyKcal = ENERGY) {
  const tracked = getTracked(id);
  if (!tracked) throw new Error(`${id} is not in the roster`);
  return resolveTile(tracked, amount, person, { energyKcal });
}

describe("macronutrients are judged on their acceptable range", () => {
  it("puts total fat inside or outside the band rather than reporting no target", () => {
    // Total fat has no RDA and no AI. Before the AMDR path existed this fell
    // through to "no reference for this age", which was both wrong and alarming.
    const inside = tile("fat-total", 60);
    expect(inside.state).toBe("met");
    expect(inside.label).toBe("Within the acceptable range");
  });

  it("reports fat below 20% of energy as below the range", () => {
    // 20% of 1721 kcal ÷ 9 = 38.2 g
    const below = tile("fat-total", 30);
    expect(below.state).toBe("below-target");
    expect(below.label).toBe("Below the acceptable range");
  });

  it("reports fat above 35% of energy as above the range, not as over a limit", () => {
    // 35% of 1721 ÷ 9 = 66.9 g. There is no UL for fat, so this must never
    // become an excess alert.
    const above = tile("fat-total", 90);
    expect(above.state).toBe("below-target");
    expect(above.label).toBe("Above the acceptable range");
    expect(above.state).not.toBe("over-ul");
  });

  it("judges carbohydrate on the band, not on the 130 g RDA floor", () => {
    // 185 g clears the RDA but sits under 45% of energy. The tile and the bar
    // beside it must not give two different verdicts about the same number.
    const carb = tile("carbohydrate", 185);
    expect(carb.label).toBe("Below the acceptable range");
  });

  it("still reports protein inside its wide band as met", () => {
    expect(tile("protein", 124).state).toBe("met");
  });

  it("falls back to the RDA when there is no energy figure to build a band from", () => {
    const tracked = getTracked("carbohydrate")!;
    const withoutEnergy = resolveTile(tracked, 185, person, {});
    expect(withoutEnergy.state).toBe("met");
    expect(withoutEnergy.label).toBe("Target met");
  });
});

describe("nutrients you steer away from rather than toward", () => {
  it("reports sodium against its limit, not as a percentage of the AI", () => {
    // Sodium's AI is 1,500 mg and its CDRR is 2,300. Showing "84% of target"
    // to someone eating 1,266 mg reads as encouragement to add salt.
    const under = tile("sodium", 1266);
    expect(under.state).toBe("met");
    expect(under.label).toBe("Under the recommended limit");
  });

  it("flags sodium above the limit", () => {
    const over = tile("sodium", 3200);
    expect(over.state).toBe("over-ul");
    expect(over.label).toBe("Over the recommended limit");
  });

  it("leaves ordinary nutrients steering toward their target", () => {
    // Calcium has a UL too, but you are meant to reach its RDA.
    expect(tile("calcium", 583).label).toBe("Low");
  });
});

describe("values this log cannot assess", () => {
  it("reports the reason instead of a status", () => {
    const tracked = getTracked("water")!;
    const resolved = resolveTile(tracked, 950, person, {
      energyKcal: ENERGY,
      unassessable: { water: "Drinks are not logged yet — food only" },
    });
    expect(resolved.state).toBe("no-target");
    expect(resolved.label).toBe("Drinks are not logged yet — food only");
  });

  it("would otherwise have reported a false shortfall", () => {
    // The point of the exception: ~950 mL of water from food against a 3700 mL
    // total-water AI reads as "low" for someone who is perfectly well hydrated.
    const tracked = getTracked("water")!;
    expect(resolveTile(tracked, 950, person, { energyKcal: ENERGY }).state).toBe("low");
  });

  it("takes precedence over every other state, including no-data", () => {
    const tracked = getTracked("water")!;
    const resolved = resolveTile(tracked, undefined, person, {
      unassessable: { water: "Drinks are not logged yet — food only" },
    });
    expect(resolved.state).toBe("no-target");
  });
});
