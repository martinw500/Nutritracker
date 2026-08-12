# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

NutriTracker is a nutrition tracker that treats micronutrients, phytonutrients, and glycemic load as first-class data. It tracks ~57 values against personalized reference intakes, explains what each one does in plain language *and* at research depth, detects multi-day deficiency and excess streaks, and logs meals from photographs. Users supply their own AI access (OpenRouter OAuth or a pasted API key), so there is no per-user inference cost.

Full detail: [docs/PLAN.md](docs/PLAN.md). Sources and their caveats: [docs/RESEARCH.md](docs/RESEARCH.md).

---

## The inviolable rule

**The AI does perception. The database does nutrition.**

A vision model is asked *"what foods are in this photo, and roughly how much?"* It is **never** asked how much of a nutrient a food contains. Every nutrient value in this application originates from USDA FoodData Central or from `data/nutrients.json`.

**Any code path where a model output becomes a nutrient value is a bug**, not a feature — even if it looks convenient, even if it would save an API call, even if the model is a good one. This single constraint is what makes cheap and local models safe to use here, and it is the reason this app can claim to be scientific.

If you find yourself writing a prompt that asks a model for calories, grams of protein, or milligrams of anything, stop and route it through the food database instead.

---

## Data integrity rules

These are hard constraints. Violating one is a correctness bug, not a style preference.

1. **Never hardcode a nutrient value in application code.** Values come from `data/nutrients.json` (reference intakes, descriptions) or from the food database (per-food composition). A magic number like `310` in a component is a bug.

2. **Every health claim carries an `evidence` tier.** Any entry in a `benefits[]` array needs `strong` | `moderate` | `limited` | `preliminary`. Claims without a tier do not ship. In user-facing copy, tier drives the hedging: `strong` may say "helps with"; anything below says "may help with" or "has been associated with."

3. **Never render a progress bar, percentage, or "% of target" for a Tier 3 phytonutrient.** Lutein, lycopene, and the flavonoids have no RDA — there is no target to be a percentage of. Inventing one is exactly the dishonesty this app exists to avoid. Show absolute amounts and trends, with `intakeContext` for framing.

4. **Never compute a composite "antioxidant score."** USDA withdrew its ORAC database in 2012 because such values have no demonstrated relevance to human health. Report named compounds in milligrams. If a task seems to call for a single antioxidant number, it does not.

5. **Distinguish "zero" from "unknown."** USDA's flavonoid databases cover ~500 foods; FoodData Central has 600,000. Most logged foods will have *no* phytonutrient data. A missing value must never render as `0` — it renders as "no data" and feeds a per-day coverage percentage. Conflating these produces charts that are alarming and wrong.

6. **Reference data carries citations.** Every entry in `data/nutrients.json` needs at least one `citations[]` entry, and `lastReviewed` gets bumped whenever content changes.

7. **Respect `storage` class in alerting.** Alert windows are 3 days (`none`), 7 days (`moderate`), 14–30 days (`high`). Flagging a one-day B12 shortfall is noise; the body stores years of it. Never alert on a raw daily value.

8. **AI-suggested log entries are drafts.** They require explicit user confirmation before being written to `log_entries`. No auto-commit path may exist, regardless of confidence score.

---

## Progressive disclosure

The app serves both general users and nutrition researchers through **one interface**, controlled by `users.detail_level` (`simple` | `expert`, default `simple`).

**Never fork components into simple and expert variants.** The moment two dashboards exist they diverge, and one rots. Use the `useDetailLevel()` hook and the `<ExpertOnly>` / `<SimpleOnly>` wrappers.

Content differences live in the **data file**, not in branching UI code — each nutrient carries both `oneLiner` / `simpleExplanation` and `summary` / `whatItDoes` / `absorption` / `interactions`. The component picks a field; it does not contain two copies of the copy.

Expert mode is a **strict superset** of simple mode. It reveals detail; it never rearranges or contradicts.

---

## Layout

```
data/          Reference data. nutrients.json, its schema, DRI tables, GI mappings.
lib/nutrition/ Calculation: scaling, daily rollups, RDA personalization, streak detection.
lib/ai/        Provider abstraction, OAuth flows, vision prompts, food-name resolver.
lib/db/        Drizzle schema and migrations.
app/           Next.js App Router routes and UI.
docs/          PLAN.md, RESEARCH.md.
```

---

## Conventions

- **Schema changes go through Drizzle migrations.** No hand-edited SQL against a live database.
- **Any nutrient math gets a unit test.** Scaling, unit conversion, RDA personalization across sex/age boundaries, and rolling averages are all places where a silent off-by-one produces plausible-looking wrong numbers. Test them.
- **Keep FDC mirroring out of the request path.** The FoodData Central API allows 1,000 requests/hour — nowhere near enough to serve live traffic. Foundation Foods and SR Legacy are mirrored locally; only branded/barcode lookups hit the live API.
- **`resolved_nutrients` is denormalized onto each log entry deliberately.** Food records get corrected over time; snapshotting the nutrient vector at log time keeps history stable. Do not "fix" this by normalizing it away.
- **Prompt-cache the vision system prompt and schema.** They are byte-identical on every call.
- **Use structured outputs for vision calls**, never prose parsing.

---

## Framing and tone

This app competes on trustworthiness. Copy should read like a well-written reference, not like supplement marketing.

- "Associated with," never "cures."
- Name the uncertainty when it exists. A `limited` evidence tier with an honest note is more valuable than a confident sentence.
- Include negative findings where they matter — vitamin C does not prevent colds, and saying so builds more trust than omitting it.
- No scare copy on excess alerts. State the actual risk and the actual threshold.
