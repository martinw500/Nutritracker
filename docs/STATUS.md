# Status

The living file. What is being worked on, what is next, what is broken, what changed.

Updated at the end of **every** change — see [../CLAUDE.md](../CLAUDE.md), "Closing the loop". Kept under ~120 lines by deleting, not archiving.

**Phase 0**, part-built. Reference layer designed and seeded; UI built against fixtures; no database, no AI.

---

## Now

Nothing in flight.

---

## Next up

1. **Write reference entries.** 5 of 59 done. Every entry added to `data/nutrients.json` lights up its dashboard row and detail page with no code change. This is the largest single chunk of work left.
2. **Drizzle schema + migrations.** The data model in [PLAN.md](PLAN.md#data-model) is designed but not built. Until it exists nothing persists.
3. **FoodData Central client + local mirror.** Foundation Foods and SR Legacy, plus resolving `topSources[].fdcId`. Replaces `data/demo/foods.json`.
4. **Wire `validate:data` into CI**, so entries are checked as they are written rather than at the end.
5. **Unit conversion** (ml / cup / tbsp / piece → g). Blocks realistic manual logging.
6. **Auth + real profile**, replacing `data/demo/profile.json`.

---

## Known issues

| Issue | Where | Severity |
|---|---|---|
| Nothing persists. Every interactive control is local state; no control writes anywhere. | all screens | expected — no DB yet |
| Quantities are grams only. `ml`, `cup`, `tbsp` and `piece` are accepted in the schema but not converted. | `lib/nutrition/scale.ts` | medium — blocks realistic logging |
| Weekly plant-diversity count is not computed. The 30-a-week target needs distinct species across 7 days; daily counts cannot give that without double-counting. Today's count is real; the weekly figure is deliberately absent rather than estimated. | `lib/demo/index.ts`, Today | medium |
| Top sources are not ranked against what you already eat, as PLAN describes. Needs the real log. | `components/nutrient-detail.tsx` | low |
| Goal modes are selectable but do not re-weight anything yet. | Settings | low |
| `fdcNutrientId` is null for 54 of 59 roster entries. Deliberate: hand-transcribed FDC nutrient numbers silently join to the wrong nutrient. The importer fills them in. | `data/roster.json` | expected |
| Logging completeness is not modelled, so the demo's averages assume every meal was logged. PLAN promises researchers a completeness warning. | Insights | low |

---

## Recently changed

- **2026-08-11** — Added `docs/STATUS.md` and the "Closing the loop" rule in CLAUDE.md: docs get updated and pruned at the end of every change.
- **2026-08-11** — Reconciled the nutrient count across every doc. PLAN said "16" Tier 1 values while listing 18 (fiber counted as one line), README said both "~35" and "~57", and "~45 entries" was a stale estimate. Everything now says **59 tracked values, 5 written**, and `data/roster.json` is the authority.
- **2026-08-11** — Built the whole UI against fixtures: Today, Nutrients roster, nutrient detail, Log, photo draft review, Insights, Settings, AI connect. Next.js 16 + Tailwind 4 + Recharts, no backend.
- **2026-08-11** — Added `data/roster.json`, the 59-value index. Nutrients in the roster but not in `nutrients.json` render an explicit "no reference yet" state instead of a blank or a zero.
- **2026-08-11** — Added `data/demo/` fixtures behind `lib/demo/index.ts` as the single import site (D12). Composed so the demo day exercises every state: a low band, a suppressed supplemental-UL, a real measured zero, and 7 of 12 foods with no phytonutrient data.
- **2026-08-11** — Added `lib/nutrition/`: `personalize` (narrowest-band life-stage resolution), `scale`, `status`, `rollup`, `format`, `roster`. 61 tests.
- **2026-08-11** — Added `npm run validate:data`: JSON Schema plus the cross-file checks a schema cannot express — roster/entry agreement, interaction targets resolving, demo fixtures referencing real ids.

---

## Verifying a change

```bash
npm run validate:data   # schema + cross-file agreement
npm test                # 61 unit and render tests
npm run typecheck
npm run dev             # every route works with no .env.local
```

The tests that matter most, because their failures look plausible on screen:

- no Tier 3 nutrient ever renders a `%` or a progress bar, in either detail mode
- a missing value renders "no data"; a measured `0` renders `0`
- dietary magnesium above the 350 mg supplemental UL is **not** flagged as excess
- vitamin C fires on a 3-day run, vitamin D on a 30-day mean, magnesium on neither
