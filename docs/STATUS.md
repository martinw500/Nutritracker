# Status

The living file. What is being worked on, what is next, what is broken, what changed.

Updated at the end of **every** change — see [../CLAUDE.md](../CLAUDE.md), "Closing the loop". Kept under ~120 lines by deleting, not archiving.

**Phase 0/1**, part-built. Reference layer largely written; database and account
foundation are implemented but need a hosted Postgres connection; nutrition UI
still runs against fixtures; no AI.

---

## Now

Nothing in flight.

---

## Next up

1. **Connect hosted Postgres.** Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`, then run `npm run db:migrate`. Account and profile persistence are already wired and retain a demo fallback when unconfigured.
2. **Persistent manual logging.** Point the existing log UI at `foods`, `log_entries`, and `daily_totals`; this is what enables date navigation.
3. **FoodData Central client + local mirror.** Replaces `data/demo/foods.json` and resolves `topSources[].fdcId`.
4. **Unit conversion** (ml / cup / tbsp / piece → g). Blocks realistic manual logging.
5. **Upgrade brief entries to full.** 37 are brief — target and citation present, prose pending. Highest value first: calcium, iron, zinc, folate, vitamin A.
6. **The 11 remaining Tier 3 phytonutrients**, which need `intakeContext` rather than targets.
7. **Goal modes should re-weight**, not just be selectable.

---

## Known issues

| Issue | Where | Severity |
|---|---|---|
| Account and health-profile persistence require a configured Postgres database and migration. The nutrition screens still use fixtures; date navigation remains disabled. | all nutrition screens | expected — persistent logging is next |
| Quantities are grams only. `ml`, `cup`, `tbsp`, `piece` are accepted but not converted. | `lib/nutrition/scale.ts` | medium |
| 37 entries are brief: real cited target, no prose. Detail pages say so rather than showing empty sections. | `data/nutrients.json` | expected — see D16 |
| A deficiency alert on a brief entry can name the shortfall but not the foods that fix it, since `topSources` is part of the prose. | Insights | medium |
| Water carries no status by design — its AI is total water and drinks are not logged. See D15. | Today | medium |
| Weekly plant-diversity count is not computed; the target is a weekly distinct-species figure and daily counts cannot give it without double-counting. Today's count is real. | `lib/demo/index.ts` | medium |
| Goal modes are multi-select and show their evidence, but do not yet re-weight anything. | Settings | low |
| `populationMedian` figures on brief entries are approximate NHANES-order values authored by hand, flagged as such in the data file's notes. | `data/nutrients.json` | low |
| `fdcNutrientId` is null for most roster entries. Deliberate — hand-transcribed FDC numbers silently join to the wrong nutrient. | `data/roster.json` | expected |

---

## Recently changed

- **2026-08-12** — Added the Postgres/Drizzle foundation and initial migration for Better Auth accounts, profiles, foods, aliases, immutable log-entry nutrient snapshots, daily totals, streaks, goal modes, and encrypted AI-credential envelopes. `/account` now supports email/password sessions and persisted health profiles whenever database environment variables are present; without them, the labelled demo continues to build and run.
- **2026-08-11** — Fixed a hydration error: `FlagChip` rendered a `<button>` and sat inside the expander `<button>` in `FoodFlagsCard`. Nested interactive elements are invalid HTML — the browser closes the outer one early, the trees diverge, and React discards the subtree. Chips are now spans; whatever wraps one owns the interaction. Guarded by a test that walks the rendered DOM for interactive nesting.
- **2026-08-11** — Filled the data layer. 47 of 59 entries now written (10 full, 37 brief) against 10 before, so every vitamin and mineral on the dashboard has a real, personalised, cited target. Introduced `depth: brief | full` (D16).
- **2026-08-11** — Replaced the dot grid with a dense labelled table. The grid borrowed a contribution-graph layout, where a tile's *position* is its label; here position labelled nothing, so every mark was anonymous and a legend could not fix it. Every row is now named, with its own bar, number and status in words.
- **2026-08-11** — Added the food-flag layer (D17): processed meat, red meat, alcohol, ultra-processed, glycemic, cardiometabolic, and positive flags. Each carries an evidence tier and citations, and derived flags are computed from composition so they cannot drift from the numbers.
- **2026-08-11** — Sodium stopped reporting "84% of target", which read as a nudge to eat more salt. Nutrients where the ceiling is the guidance now say so (D18).
- **2026-08-11** — Product pass: sticky top bar with date navigation, raised add-food action on mobile, per-section "Show all" expanders so detail is reachable without the global expert switch, and a dark-mode contrast lift — the previous borders and muted ink sat too close to the surface.
- **2026-08-11** — Goal modes are multi-select. They are mostly orthogonal, so forcing one choice was a modelling error rather than a simplification.
- **2026-08-11** — Fixed the validator's tier inference, which conflated "Tier 3" with "has no DRI". EPA+DHA and cholesterol are macronutrients with no reference intake — legitimate, and previously unrepresentable.

---

## Verifying a change

```bash
npm run validate:data   # schema, cross-file agreement, every flag cited
npm test                # 128 unit and render tests
npm run typecheck
npm run db:migrate      # when DATABASE_URL is configured
npm run dev             # every route works with no .env.local
```

The tests that matter most, because their failures look plausible on screen:

- no Tier 3 nutrient renders a `%` or a progress bar, in either detail mode
- a missing value renders "no data"; a measured `0` renders `0`
- dietary magnesium above the 350 mg supplemental UL is **not** flagged as excess
- fat above its AMDR reads "above the acceptable range", never "over a limit"
- sodium reads against its ceiling, never as a percentage of its AI
- a brief entry renders its target and never an empty prose section
- every food flag carries an evidence tier and a citation
- vitamin C fires on a 3-day run, vitamin D on a 30-day mean, magnesium on neither
