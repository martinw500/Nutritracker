/**
 * Nesting guards.
 *
 * A `<button>` inside a `<button>` is invalid HTML. The browser closes the
 * outer element early while React's virtual tree keeps the nesting, so the
 * server and client markup disagree and hydration fails — a whole subtree gets
 * thrown away and re-rendered. It looks fine in a screenshot and breaks in the
 * console, which is exactly the kind of failure worth a test rather than an
 * eyeball.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailLevelProvider } from "./detail-level";
import { FlagChip, FlagChips, FoodFlagsCard } from "./food-flags";
import { resolveFoodAttributes, tallyAttributes } from "@/lib/nutrition/attributes";

const bacon = {
  gi: 0,
  nutrients: { sodium: 1717, "fat-saturated": 13.7 },
  attributes: ["processed-meat", "red-meat", "ultra-processed"],
};
const lentils = {
  gi: 32,
  nutrients: { sodium: 2, "fat-saturated": 0.05 },
  attributes: ["legume"],
};

const tallies = tallyAttributes([
  { name: "Bacon", food: bacon },
  { name: "Lentils", food: lentils },
]);

function renderIn(ui: React.ReactNode, detail: "simple" | "expert" = "simple") {
  return render(<DetailLevelProvider initial={detail}>{ui}</DetailLevelProvider>);
}

/** Interactive elements that must never contain one another. */
function findNestedInteractive(root: HTMLElement): string[] {
  const problems: string[] = [];
  for (const outer of root.querySelectorAll("button, a[href]")) {
    for (const inner of outer.querySelectorAll("button, a[href]")) {
      problems.push(`${outer.tagName.toLowerCase()} > ${inner.tagName.toLowerCase()}`);
    }
  }
  return problems;
}

describe("FoodFlagsCard", () => {
  for (const detail of ["simple", "expert"] as const) {
    it(`nests no interactive element inside another in ${detail} mode`, () => {
      const { container } = renderIn(<FoodFlagsCard tallies={tallies} />, detail);
      expect(findNestedInteractive(container)).toEqual([]);
    });
  }

  it("renders the flags it was given, with what caused each", () => {
    const { container } = renderIn(<FoodFlagsCard tallies={tallies} />);
    expect(container.textContent).toContain("Processed meat");
    expect(container.textContent).toContain("from Bacon");
    expect(container.textContent).toContain("Legume");
  });

  it("separates cautions from positives rather than listing one kind", () => {
    const { container } = renderIn(<FoodFlagsCard tallies={tallies} />);
    expect(container.textContent).toContain("Worth knowing");
    expect(container.textContent).toContain("Doing well");
  });

  it("handles a day with nothing flagged", () => {
    const { container } = renderIn(<FoodFlagsCard tallies={[]} />);
    expect(container.textContent).toContain("Nothing flagged");
    expect(findNestedInteractive(container)).toEqual([]);
  });
});

describe("FlagChip", () => {
  it("is a span, so it is safe inside any interactive wrapper", () => {
    const attribute = resolveFoodAttributes(lentils)[0];
    const { container } = renderIn(<FlagChip attribute={attribute} />);
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });

  it("keeps the claim in the title, so it is never colour-only", () => {
    const attribute = resolveFoodAttributes(lentils)[0];
    const { container } = renderIn(<FlagChip attribute={attribute} />);
    expect(container.firstElementChild?.getAttribute("title")).toBeTruthy();
  });
});

describe("FlagChips", () => {
  it("caps the list and says how many are hidden", () => {
    const { container } = renderIn(
      <FlagChips attributes={resolveFoodAttributes(bacon)} max={2} />,
    );
    // Bacon raises 5 flags: three declared plus high sodium and high saturated fat.
    expect(container.textContent).toContain("+3");
  });

  it("renders nothing when a food has no flags", () => {
    const { container } = renderIn(<FlagChips attributes={[]} />);
    expect(container.textContent).toBe("");
  });
});
