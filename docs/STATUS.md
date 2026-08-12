# Status

The living file. What is being worked on, what is next, what is broken, what changed.

Updated at the end of **every** change — see [../CLAUDE.md](../CLAUDE.md), "Closing the loop". Kept under ~120 lines by deleting, not archiving.

**Phase 0**, part-built. Reference layer designed and seeded; UI built against fixtures; no database, no AI.

---

## Now

Nothing in flight.

---

## Next up

1. **Write reference entries.** 10 of 59 done. Every entry added to `data/nutrients.json` lights up its dashboard tile, row and detail page with no code change. Largest chunk of work left.
2. **Drizzle schema + migrations.** The data model in [PLAN.md](PLAN.md#data-model) is designed but not built. Until it exists nothing persists.
3. **FoodData Central client + local mirror.** Foundation Foods and SR Legacy, plus resolving `topSources[].fdcId`. Replaces `data/demo/foods.json`.
4. **Unit conversion** (ml / cup / tbsp / piece → g). Blocks realistic manual logging.
5. **Log drinks as entries**, so water can be assessed properly instead of being marked unassessable.
6. **Auth + real profile**, replacing `data/demo/profile.json`.

---

## Known issues

| Issue | Where | Severity |
|---|---|---|
| Nothing persists. Every interactive control is local state; no control writes anywhere. | all screens | expected — no DB yet |
| Quantities are grams only. `ml`, `cup`, `tbsp` and `piece` are accepted in the schema but not converted. | `lib/nutrition/scale.ts` | medium — blocks realistic logging |
| Water carries no status, deliberately: its AI is total water and drinks are not logged, so judging it on food alone reported a false shortfall. The widget tracks drinks in local state only. See D15. | Today | medium |
| Weekly plant-diversity count is not computed. The 30-a-week target needs distinct species across 7 days; daily counts cannot give that without double-counting. Today's count is real; the weekly figure is deliberately absent rather than estimated. | `lib/demo/index.ts`, Today | medium |
| Weight readings are fixture-only and not editable. | `data/demo/history.json` | low |
| Top sources are not ranked against what you already eat, as PLAN describes. Needs the real log. | `components/nutrient-detail.tsx` | low |
| Goal modes are selectable but do not re-weight anything yet. | Settings | low |
| Logging completeness is not modelled, so averages assume every meal was logged. PLAN promises researchers a completeness warning. | Insights | low |
| `fdcNutrientId` is null for 54 of 59 roster entries. Deliberate: hand-transcribed FDC nutrient numbers silently join to the wrong nutrient. The importer fills them in. | `data/roster.json` | expected |

---

## Recently changed

- **2026-08-11** — Visual redesign. New palette: warm light-first surfaces, a violet chrome accent kept distinct from every data colour, and the macro series and status colours taken from a validated palette rather than invented. Ran the validator against the real surfaces — all checks pass in both modes.
- **2026-08-11** — Today rebuilt. Energy ring, macro range bars, a 59-tile status grid with drill-down replacing the wall of rows, meals, 7-day energy columns, 30-day protein trend, water and weight cards, and a KPI row.
- **2026-08-11** — Status colours are never the only channel. Each of the seven tile states carries a distinct glyph shape and its state in words — measured, "met" green and "over limit" red sit ΔE 4.1 apart under deuteranopia.
- **2026-08-11** — Wrote 5 macronutrient reference entries (protein, carbohydrate, total fat, fiber, water), taking the roster from 5/59 to 10/59.
- **2026-08-11** — Schema gained an optional `amdr` block. Total fat has no RDA and no AI, so a percent-of-energy band is its only possible reference. Macros now render a range rather than a fake point target (D14).
- **2026-08-11** — `lib/nutrition/energy.ts`: Mifflin-St Jeor energy estimate, cited and labelled an estimate wherever it appears (D13). The only number in the app that originates in code.
- **2026-08-11** — Values the log cannot assess carry a reason instead of a status, rather than being judged on partial data (D15).
- **2026-08-11** — Committed and pushed the app. The Vercel build had been failing because the repo held only the original 10 documentation files — no `package.json`, no framework to detect. Added `.github/workflows/ci.yml`.
- **2026-08-11** — Added `docs/STATUS.md` and the "Closing the loop" rule in CLAUDE.md.

---

## Verifying a change

```bash
npm run validate:data   # schema + cross-file agreement
npm test                # 99 unit and render tests
npm run typecheck
npm run dev             # every route works with no .env.local
```

The tests that matter most, because their failures look plausible on screen:

- no Tier 3 nutrient renders a `%` or a progress bar, in either detail mode
- no Tier 3 tile carries a status colour, and every tile state has a glyph and a label
- a missing value renders "no data"; a measured `0` renders `0`
- dietary magnesium above the 350 mg supplemental UL is **not** flagged as excess
- fat above its AMDR reads "above the acceptable range", never "over a limit" — there is no UL for fat
- vitamin C fires on a 3-day run, vitamin D on a 30-day mean, magnesium on neither
