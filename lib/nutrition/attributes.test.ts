import { describe, expect, it } from "vitest";
import {
  getAllAttributes,
  getAttribute,
  resolveFoodAttributes,
  resolveMealAttributes,
  tallyAttributes,
} from "./attributes";

const bacon = {
  gi: 0,
  nutrients: { sodium: 1717, "fat-saturated": 13.7, "fat-trans": 0.1, "sugars-added": 0 },
  attributes: ["processed-meat", "red-meat", "ultra-processed"],
};

const lentils = {
  gi: 32,
  nutrients: { sodium: 2, "fat-saturated": 0.05, "sugars-added": 0 },
  attributes: ["legume"],
};

const whiteBread = {
  gi: 75,
  nutrients: { sodium: 490, "fat-saturated": 0.78, "sugars-added": 4.3 },
  attributes: ["refined-grain", "ultra-processed"],
};

describe("every flag carries its evidence and a citation", () => {
  it("holds for all of them — the same rule that binds benefits[]", () => {
    for (const attribute of getAllAttributes()) {
      expect(["strong", "moderate", "limited", "preliminary"]).toContain(
        attribute.evidence,
      );
      expect(attribute.citations.length).toBeGreaterThan(0);
      expect(attribute.detail.length).toBeGreaterThan(40);
    }
  });

  it("states the size of the risk, not only the classification", () => {
    // "Group 1 carcinogen" alone is true and misleading. IARC groups describe
    // confidence in the evidence, not magnitude of risk, and the detail text
    // has to say both.
    const processed = getAttribute("processed-meat")!;
    expect(processed.detail).toMatch(/18%/);
    expect(processed.detail.toLowerCase()).toContain("not how large the risk is");
  });

  it("names a threshold for every derived flag, so the reader can check it", () => {
    for (const attribute of getAllAttributes()) {
      if (attribute.source === "derived") {
        expect(attribute.threshold).toBeTruthy();
      }
    }
  });
});

describe("derived flags come from composition", () => {
  it("flags high sodium from the number, not from a hand-applied tag", () => {
    const ids = resolveFoodAttributes(bacon).map((a) => a.id);
    expect(ids).toContain("high-sodium");
    expect(ids).toContain("high-saturated-fat");
  });

  it("flags a high glycemic index from the GI value", () => {
    expect(resolveFoodAttributes(whiteBread).map((a) => a.id)).toContain("high-gi");
    expect(resolveFoodAttributes(lentils).map((a) => a.id)).not.toContain("high-gi");
  });

  it("does not flag added sugar on a measured zero", () => {
    // "We looked and there is none" must not raise a warning.
    expect(resolveFoodAttributes(lentils).map((a) => a.id)).not.toContain("added-sugar");
    expect(resolveFoodAttributes(whiteBread).map((a) => a.id)).toContain("added-sugar");
  });

  it("does not flag anything when the composition value is absent", () => {
    const unknown = { gi: null, nutrients: {}, attributes: [] };
    expect(resolveFoodAttributes(unknown)).toHaveLength(0);
  });
});

describe("declared flags come from the food record", () => {
  it("keeps declared and derived flags together in one list", () => {
    const ids = resolveFoodAttributes(bacon).map((a) => a.id);
    expect(ids).toContain("processed-meat");
    expect(ids).toContain("high-sodium");
  });

  it("ignores a declared id that is not a known flag", () => {
    const odd = { gi: null, nutrients: {}, attributes: ["not-a-real-flag"] };
    expect(resolveFoodAttributes(odd)).toHaveLength(0);
  });
});

describe("ordering", () => {
  it("puts cautions before positives, strongest evidence first", () => {
    const mixed = {
      gi: 75,
      nutrients: { sodium: 490, "sugars-added": 4.3 },
      attributes: ["legume", "processed-meat"],
    };
    const resolved = resolveFoodAttributes(mixed);
    const firstPositive = resolved.findIndex((a) => a.polarity === "positive");
    const lastCaution = resolved.map((a) => a.polarity).lastIndexOf("caution");
    expect(lastCaution).toBeLessThan(firstPositive);
  });
});

describe("meal-level flags", () => {
  it("flags a high glycemic load meal", () => {
    expect(resolveMealAttributes(28).map((a) => a.id)).toContain("high-gl-meal");
  });

  it("leaves a modest meal unflagged", () => {
    expect(resolveMealAttributes(9)).toHaveLength(0);
  });
});

describe("tallying across a day", () => {
  it("records which foods raised each flag", () => {
    const tallies = tallyAttributes([
      { name: "Bacon", food: bacon },
      { name: "White bread", food: whiteBread },
      { name: "Lentils", food: lentils },
    ]);

    const sodium = tallies.find((t) => t.attribute.id === "high-sodium");
    expect(sodium?.foods).toEqual(["Bacon", "White bread"]);

    const legume = tallies.find((t) => t.attribute.id === "legume");
    expect(legume?.foods).toEqual(["Lentils"]);
  });

  it("includes positive flags, so the feature is not purely a warning list", () => {
    const tallies = tallyAttributes([{ name: "Lentils", food: lentils }]);
    expect(tallies.some((t) => t.attribute.polarity === "positive")).toBe(true);
  });

  it("does not double-count a flag raised by two foods", () => {
    const tallies = tallyAttributes([
      { name: "Bacon", food: bacon },
      { name: "White bread", food: whiteBread },
    ]);
    expect(tallies.filter((t) => t.attribute.id === "ultra-processed")).toHaveLength(1);
  });
});
