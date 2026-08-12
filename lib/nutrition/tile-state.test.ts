import { describe, expect, it } from "vitest";
import { getTracked } from "./roster";
import { isStatusState, resolveTile, severityRank, TILE_TONE } from "./tile-state";
import type { TileState } from "./tile-state";

const person = { sex: "male", ageYears: 28, pregnancyStatus: "none" } as const;

function tile(id: string, amount: number | undefined) {
  const tracked = getTracked(id);
  if (!tracked) throw new Error(`${id} is not in the roster`);
  return resolveTile(tracked, amount, person);
}

describe("the three states that are not statuses", () => {
  it("reports no-data when nothing logged carried a value", () => {
    expect(tile("lycopene", undefined).state).toBe("no-data");
  });

  it("reports a measured zero as a real reading, not as no-data", () => {
    // Blueberries genuinely contain no flavones. That is data.
    expect(tile("flavones", 0).state).not.toBe("no-data");
  });

  it("reports no-reference for a tracked value with no entry written", () => {
    // Energy is tracked but deliberately has no entry — its target comes from
    // an equation, not a table. See D13.
    expect(tile("energy", 1721).state).toBe("no-reference");
  });

  it("reports no-target for a phytonutrient, whatever the amount", () => {
    for (const amount of [0, 0.5, 11.4, 10_000]) {
      expect(tile("lutein-zeaxanthin", amount).state).toBe("no-target");
    }
  });

  it("never assigns a status state to a Tier 3 value", () => {
    const phyto = ["lutein-zeaxanthin", "beta-carotene", "flavonols", "anthocyanidins"];
    for (const id of phyto) {
      const resolved = tile(id, 12);
      // beta-carotene and flavonols have no written entry yet, so they land on
      // no-reference; lutein has one and lands on no-target. Neither is a status.
      expect(isStatusState(resolved.state)).toBe(false);
    }
  });
});

describe("the four states that are statuses", () => {
  it("maps a shortfall below 70% of the RDA to low", () => {
    expect(tile("vitamin-c", 57.2).state).toBe("low");
  });

  it("maps 70–99% to below-target", () => {
    expect(tile("vitamin-c", 80).state).toBe("below-target");
  });

  it("maps at or above the RDA to met", () => {
    expect(tile("vitamin-c", 95).state).toBe("met");
  });

  it("does not use over-ul for an intake above a supplements-only limit", () => {
    // 492 mg of dietary magnesium against a 350 mg supplemental ceiling.
    const resolved = tile("magnesium", 492);
    expect(resolved.state).toBe("met");
    expect(resolved.status?.ulNotApplicable).toBe(true);
  });

  it("falls back to no-target when the reference has no band for this age", () => {
    const tracked = getTracked("vitamin-c")!;
    const infant = { sex: "male", ageYears: 0, pregnancyStatus: "none" } as const;
    expect(resolveTile(tracked, 40, infant).state).toBe("no-target");
  });
});

describe("every state is legible without colour", () => {
  const allStates: TileState[] = [
    "no-data",
    "no-reference",
    "no-target",
    "low",
    "below-target",
    "met",
    "over-ul",
  ];

  it("gives every state a label in words", () => {
    // The label is what the tooltip, the screen-reader text and the
    // needs-attention line all read from. Status colour alone is not
    // distinguishable — met green against over-limit red measures ΔE 4.1
    // under deuteranopia — so this is not optional.
    for (const state of allStates) {
      const resolved = tile(
        state === "no-data" ? "lycopene" : "vitamin-c",
        state === "no-data" ? undefined : 95,
      );
      expect(resolved.label.length).toBeGreaterThan(0);
    }
  });

  it("gives every state a tone entry, so none falls back to unstyled", () => {
    for (const state of allStates) {
      expect(TILE_TONE[state]).toBeDefined();
      expect(TILE_TONE[state].text).toMatch(/^text-/);
    }
  });

  it("ranks over-limit and low above everything else for the attention list", () => {
    expect(severityRank("over-ul")).toBeLessThan(severityRank("low"));
    expect(severityRank("low")).toBeLessThan(severityRank("below-target"));
    expect(severityRank("below-target")).toBeLessThan(severityRank("met"));
    expect(severityRank("below-target")).toBeLessThan(severityRank("no-data"));
  });
});
