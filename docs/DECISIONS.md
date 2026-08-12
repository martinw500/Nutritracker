# Decisions

Choices that are settled, and *why* — so they don't get relitigated or accidentally reversed. The reasoning behind most of these came from research and discussion that isn't recoverable from the code.

Each entry: what was decided, why, and what it forecloses. If you want to reverse one, the "why" is the thing to argue with.

---

### D1 — The AI does perception; the database does nutrition
**Status:** settled · foundational

Vision models identify foods and estimate portions. They are never asked for nutrient values. Every number comes from USDA FoodData Central or `data/nutrients.json`.

**Why:** a bad model misidentifying a food is visible and correctable; a bad model inventing "spinach has 400 mg magnesium" is invisible and wrong. This one constraint is what makes cheap models, and local models, safe to use.

**Forecloses:** any "just ask the model for the calories" shortcut, however convenient. See [../CLAUDE.md](../CLAUDE.md).

---

### D2 — BYOK only. No owner-funded free tier.
**Status:** settled by project owner

Every user supplies their own AI access. The project ships **no** fallback key, no free quota, and no subscription that would put inference cost on the owner.

**Why:** stated directly by the owner — running inference on their own key is not on the table at any volume.

**Consequences, which are real:**
- Onboarding has a hard wall: users need an OpenRouter account with credit before photo logging works at all.
- **Manual logging must therefore be fully functional with no AI configured** — otherwise a user who won't connect a key has a useless app. This is why Phase 1 (manual + dashboard) ships before Phase 2 (AI).
- Surface the actual cost during onboarding (~$0.002/log, under a dollar for a year of daily use). "Bring your own key" sounds expensive until people see the number.

---

### D3 — OpenRouter OAuth as the primary connect path
**Status:** settled

One-click OAuth (PKCE) to OpenRouter, with direct key paste as fallback.

**Why:** the owner wanted the click-a-link flow Claude Code and Codex use. Researched: **Anthropic offers no third-party OAuth at all**, and OpenAI's "Sign in with ChatGPT" (Aug 2026) grants identity only — name, email, avatar — not API access, and is limited to six launch partners. OpenRouter's PKCE flow is the only one that actually delivers this, and it covers Claude, GPT, Gemini, Llama and hundreds more through one integration.

**Forecloses:** building per-provider OAuth. Don't re-research this; the finding is in [RESEARCH.md](RESEARCH.md#3-ai-provider-authentication--the-click-a-link-to-sign-in-question).

---

### D4 — Local models allowed, but flagged
**Status:** settled

Users may point at Ollama or LM Studio.

**Why:** the owner worried weak models would produce wrong data. Under D1 they can't — a small local model can misidentify a food, but it cannot fabricate a nutrient value. The blast radius is a visible, correctable mistake.

**Consequence:** those logs are marked low-confidence, quick-accept is disabled, and a one-time notice explains that small models misidentify foods more often.

---

### D5 — No ORAC score. No composite antioxidant score of any kind.
**Status:** settled · non-negotiable

**Why:** USDA *removed* its ORAC database in 2012, stating the values have no demonstrated relevance to human health. The numbers persist in supplement marketing because they sell well. Shipping one would undermine the credibility of everything else.

**Instead:** named carotenoids (already in FDC), measured flavonoids by subclass (USDA's three public-domain databases), and a plant-diversity count.

**Forecloses:** any single-number "antioxidant rating," however much a future UI seems to want one.

---

### D6 — Alert windows scale with nutrient storage class
**Status:** settled

3 days for unstored nutrients (vitamin C, B vitamins), 7 days for moderate (magnesium, zinc, iron), 14–30 days for stored (B12, A, D, E, K).

**Why:** flagging a one-day B12 shortfall is noise — the liver holds years of it. Most trackers that attempt deficiency warnings fire daily against RDA, generate constant false alarms, and get their notifications disabled within a week.

**Consequence:** `storage` is a required field on every nutrient entry, and alerting must never read a raw daily value.

---

### D7 — Progressive disclosure, not two separate modes
**Status:** settled by project owner

One interface. Simple by default; an expert toggle reveals EAR/AI/UL, exact values, evidence tiers, provenance, and export.

**Why:** the app targets both general users and nutrition scientists. Two separate UIs diverge, and one rots.

**Consequence:** components are never forked. Content variance lives in the data file (`oneLiner` vs `summary`), not in branching UI code. Expert mode is a strict superset — it reveals detail, never rearranges or contradicts.

---

### D8 — Phytonutrients structurally cannot have targets
**Status:** settled · enforced by schema

Tier 3 entries carry `reference: null` and an `intakeContext` block instead.

**Why:** lutein has no RDA, no deficiency disease, and no ceiling. A progress bar would invent a target that doesn't exist — exactly the dishonesty this app exists to avoid.

**Consequence:** `nutrients.schema.json` *rejects* a phytonutrient with a reference intake. This is enforcement, not convention.

---

### D9 — Write 5 nutrient entries, then the other 40
**Status:** settled · already paid off

**Why:** 59 richly-written entries is the largest single chunk of work in the project. Validating the schema against five entries chosen to hit every branch costs a day; discovering a schema flaw at entry 45 costs a week.

**It already caught two gaps:** `fdcId` had to become nullable (hand-written FDC IDs silently link to the wrong food), and the database needed a root-level `notes` array to record that `per100g` values are approximate.

---

### D10 — PWA first, native later (or never)
**Status:** settled

Next.js installable PWA, not React Native.

**Why:** camera via `<input capture>`, home-screen install, web push on iOS 16.4+, and offline logging via service worker cover ~90% of native food-tracker UX at ~20% of the effort. App-store friction isn't worth paying before the app has users.

**Consequence:** keep the backend platform-agnostic behind a clean API, so an Expo client can be added later against the same endpoints if it earns it.

---

### D11 — Manual logging ships before AI logging
**Status:** settled

Phase 1 is a complete, useful app with no AI in it.

**Why:** two reasons. It de-risks D2's onboarding wall (the app is useful before anyone connects a key), and two weeks of actually using it will teach more about the data model than further planning will.

---

### D12 — Demo fixtures are data, quarantined behind one import
**Status:** settled · temporary by design

The UI was built before the database and the FoodData Central mirror, against fabricated fixtures in `data/demo/`. Only `lib/demo/index.ts` may import them.

**Why:** an unlabelled fixture eventually gets quoted as a real figure. Three things keep that from happening — the values live in a data file rather than in component code, there is exactly one import site to delete when real data arrives, and every screen carries a visible "demo data" banner.

**Consequence:** the fixtures are composed to exercise the states that are easy to get wrong — a food with no phytonutrient coverage, a genuine measured zero, an intake above a supplements-only UL that must *not* be flagged, and a shortfall visible only on a 30-day mean. Verifying those by eye is the point of them existing.

**Forecloses:** demo values leaking into a production path, and any temptation to "just keep" the fixture foods once the mirror lands.

---

### D13 — The energy equation lives in code, not in the data file
**Status:** settled

Every other target is read from `data/nutrients.json`. The energy target is computed in `lib/nutrition/energy.ts` from Mifflin-St Jeor plus an activity factor.

**Why:** there is no reference intake for calories and there cannot be one — the requirement depends on body size, composition, age and activity, so the DRI framework publishes an equation rather than a table. There is nothing to look up. CLAUDE.md rule 1 bans hardcoded *nutrient values*; a published metabolic equation is not a composition value.

**Consequences, and they are binding:**
- It is labelled "estimated need" everywhere, never "RDA" or "target".
- The ±10% band is shown alongside it, because the equation is wrong by more than 10% for roughly one person in five.
- Expert mode names the equation and the activity factor used.
- This is the *only* number in the app allowed to originate in code. If a second one appears, that is the point to reopen this.

---

### D14 — Macronutrients are judged on their AMDR, against energy eaten
**Status:** settled

The schema gained an optional `amdr` block, and macronutrient status is assessed against that band rather than against the RDA where both exist.

**Why:** total fat has no EAR, RDA or adult AI at all — an AMDR is its only published reference. And the AMDR describes the *composition* of a diet, so its denominator is the energy actually consumed, not the estimated need. Computing the band against estimated need turns a composition question into an adequacy one, and put two different verdicts about the same number on one screen (the status tile said "met" while the bar beside it said "below the range").

**Consequence:** a macronutrient renders a shaded range band, never a point target. The RDA, where one exists, is still marked as a floor.

---

### D15 — A missing source is not a shortfall
**Status:** settled

Values the log genuinely cannot assess are marked as such and carry no status, instead of being judged on partial data. Water is the case that forced it: its AI is *total* water including drinks, drinks are not logged as foods, so judging it on the ~1 L that arrives in food reported "low" to a perfectly well-hydrated user.

**Why:** the same reasoning as D6. A false alarm costs more than a missing signal, because it teaches people to ignore the alerts that matter.

**Consequence:** `resolveTile` takes an `unassessable` map of id → reason, and the reason appears on screen in place of a status. Every use is a deliberate, named exception rather than a silent suppression.

---

### D16 — Entries have a depth: `brief` or `full`
**Status:** settled

A `brief` entry carries a real, cited reference intake and a one-liner, and may omit the prose blocks. A `full` entry requires all of them. The schema enforces which fields each may skip, and the UI badges a brief entry.

**Why:** requiring a complete write-up before a nutrient could show a target left 49 of 59 rendering as blanks. That read as broken software rather than as unfinished content, and it made the dashboard useless for the thing it exists to do. Splitting the two lets the target ship with its citation while the prose follows.

**Consequences:**
- A brief entry never renders an empty section. It is absent or it is written — `validate:data` rejects a present-but-empty prose field.
- Citations render at *both* depths. A brief entry is defined by having a cited target; hiding the citation would remove the only thing making it trustworthy.
- 47 of 59 entries now exist, 10 full and 37 brief. The remaining 12 are the Tier 3 phytonutrients, which have no reference intake by definition, and energy (D13).

**Forecloses:** treating "not yet documented" as equivalent to "no data". They are different states and the UI says which.

---

### D17 — Foods carry flags, not just nutrient amounts
**Status:** settled

`data/food-attributes.json` describes properties of foods — processed meat, ultra-processed, high-GI, whole grain, legume — each with an evidence tier and citations, under the same rule that binds `benefits[]`.

**Why:** the per-nutrient view misses what people actually decide by. "This is cured meat" is more actionable than any milligram figure, and a tracker that cannot say it is missing the more legible half of nutrition.

**The tone rule, which is the hard part:** IARC groups describe *how confident* the evidence is, not *how large* the risk is. "Processed meat is in the same category as tobacco" is the most misreported fact in the field. Every cancer flag states the actual effect size (+18% colorectal cancer risk per 50 g/day), states that classification is about confidence, and states that no safe threshold was established.

**Consequences:**
- Derived flags (high sodium, high saturated fat, added sugar, high GI) are computed from composition, so a flag cannot drift away from the number behind it. `validate:data` rejects a food that declares one by hand.
- Positive flags exist and render identically. A feature that only ever warns gets ignored.

---

### D18 — Some nutrients are a ceiling, not a target
**Status:** settled

`reference.primaryGuide: "limit"` marks nutrients where the upper limit is the guidance and the RDA or AI is not. Sodium is the case that forced it.

**Why:** sodium's AI is 1,500 mg and its CDRR is 2,300 mg. Rendering "84% of target" to someone eating 1,266 mg reads as a nudge to add salt — the exact opposite of every piece of advice on the subject. The bug is not the arithmetic, it is assuming every reference is something to reach.

**Consequence:** a `limit` nutrient reports "under the recommended limit" or "over" it, and never a percentage of an intake nobody needs help achieving.

---

## Still open

These have **not** been decided. Don't assume an answer.

| Question | Notes |
|---|---|
| Hosting | Vercel is the obvious default for Next.js; Postgres via Supabase or Neon. Not chosen. |
| Monetization | D2 rules out inference-cost-bearing subscriptions. Whether anything is charged for at all is open. |
| Licensing | No `LICENSE` file. Note that Open Food Facts data is ODbL (share-alike), which has implications if the project is ever commercial. |
| Account model | Whether accounts are required, or local-only storage is offered. |
| Data export / deletion | Expert mode implies CSV export; a full GDPR-style delete path isn't specced. |
| Sulforaphane and other excluded phytonutrients | Deferred on data coverage, not on merit. Revisit when data exists. |
