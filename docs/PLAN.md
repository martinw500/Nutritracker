# Build Plan

Architecture, data model, feature specs, and build sequence. Sourced findings behind these decisions live in [RESEARCH.md](RESEARCH.md); the rules that bind implementation live in [../CLAUDE.md](../CLAUDE.md).

---

## The decision everything hangs on

**The AI does perception. The database does nutrition.**

```
photo ──▶ vision model ──▶ [{ "grilled chicken breast", 150, "g", conf 0.9 },
                            { "white rice, cooked",    200, "g", conf 0.8 }]
                                        │
                            food-name → FDC ID resolver (cached)
                                        │
                      USDA FoodData Central: per-100g nutrient vector
                                        │
                       scale by quantity → user confirms/edits → log
```

The model is never asked *"how much zinc is in this?"* Only *"what foods are here, and roughly how much?"*

1. **Weak models stay safe.** A bad model misidentifies a food — visible and correctable — instead of inventing a nutrient value, which is invisible and wrong. This is what makes allowing local models defensible.
2. **Cheap models are good enough.** ~$0.002 per photo log.
3. **Confirmation is mandatory.** Identification runs ~86% accurate; end-to-end drops to ~68% because portion estimation is the weak link. AI output is always a draft.

---

## Stack

| Choice | Why |
|---|---|
| **Next.js (App Router) + TypeScript** as an installable PWA | Camera via `<input capture>`, home-screen install, web push for alerts (iOS 16.4+), offline logging via service worker + IndexedDB. ~90% of native UX at ~20% of the effort. |
| **Postgres** (Supabase or Neon) | Relational data with heavy time-series aggregation; `jsonb` for nutrient vectors. |
| **Drizzle ORM** | Typed schema, clean migrations. |
| **Tailwind + shadcn/ui** | Dense dashboards without hand-rolling components. |
| **Recharts** | Nutrient bars, streak timelines, trends. |

Keep the backend platform-agnostic behind a clean API. Add an Expo client later *if* it earns it — the camera and notification gaps in a PWA don't justify app-store friction now.

---

## The complete nutrient roster

**59 tracked values**, in three tiers that behave differently. The authoritative list is [`data/roster.json`](../data/roster.json); this section is the reasoning behind it.

### Tier 1 — Energy & macronutrients (18)

Energy (kcal) · Protein · Total carbohydrate · Fiber total · Fiber soluble · Fiber insoluble · Total sugars · Added sugars · Total fat · Saturated fat · Monounsaturated fat · Polyunsaturated fat · Omega-3 ALA · Omega-3 EPA+DHA · Omega-6 linoleic acid · Trans fat · Cholesterol · Water

### Tier 2 — Micronutrients with reference intakes (29)

**Vitamins (13)** — the canonical set, nothing missing:

| Fat-soluble | Water-soluble |
|---|---|
| A (as RAE) · D · E (α-tocopherol) · K | C · B1 thiamin · B2 riboflavin · B3 niacin · B5 pantothenic acid · B6 · B7 biotin · B9 folate · B12 |

**Minerals (15):**

| Major | Trace |
|---|---|
| Calcium · Phosphorus · Magnesium · Sodium · Potassium · Chloride | Iron · Zinc · Copper · Manganese · Selenium · Iodine · Chromium · Molybdenum · Fluoride |

**Other essential (1):** Choline

Every Tier 2 entry has an RDA or AI, most have a UL, and all get the deficiency/excess streak treatment.

### Tier 3 — Phytonutrients, no reference intake (12)

**No RDA, no deficiency disease, no ceiling.** Track intake and trend, never "% of target" — a progress bar here would be inventing a target that doesn't exist.

| Group | Compounds |
|---|---|
| **Carotenoids** | α-carotene · β-carotene · β-cryptoxanthin · Lycopene · Lutein + zeaxanthin |
| **Flavonoids** | Flavonols · Flavones · Flavanones · Flavan-3-ols · Anthocyanidins · Isoflavones · Proanthocyanidins |

**Deliberately excluded for now** — data coverage is too thin to be honest about: glucosinolates/sulforaphane, allicin, betalains, ellagitannins. Revisit after the core ships; sulforaphane has the best mechanistic evidence of any phytonutrient and deserves a slot once the data exists.

### Derived metrics (expert mode)

Computed, not stored: omega-6 : omega-3 ratio · sodium : potassium ratio · glycemic load per meal and per day · protein per kg bodyweight · nutrient density (per 100 kcal) · plant diversity (distinct species per week, target 30).

### On antioxidants

**No ORAC score, no composite antioxidant score of any kind.** USDA withdrew its ORAC database in 2012 — the values have no demonstrated relevance to human health.

"Antioxidant" spans two categories that are modeled differently:

- **Vitamin C, vitamin E, selenium, manganese, zinc, copper** are *essential nutrients with antioxidant roles*. Tier 2, real RDAs and ULs. Flagged `antioxidantRole: true` so an Antioxidants view can gather them — but they are not a separate system.
- **Carotenoids and flavonoids** are Tier 3. Report in mg. Never as an index.

The Antioxidants view assembles across both tiers: real numbers, honest framing, no invented composite.

---

## Data sources

Full detail, licenses, and caveats in [RESEARCH.md](RESEARCH.md).

| Source | Role | License | Constraint |
|---|---|---|---|
| **USDA FoodData Central** | Nutrient backbone; also supplies carotenoids | CC0 | 1,000 req/hr → **must mirror locally** |
| **USDA Flavonoid DB 3.3** | 506 foods, 26 flavonoids, 5 subclasses | Public domain | **Already FDC-keyed**; MS Access format |
| **USDA Isoflavone DB 2.1** | 560 foods | Public domain | Separate download |
| **USDA Proanthocyanidin DB 2.1** | 285 foods | Public domain | Separate download |
| **Phenol-Explorer** | Coverage gaps only | Free download | Broader, but needs manual FDC mapping |
| **Open Food Facts** | Barcode lookup | ⚠️ ODbL — share-alike | Crowdsourced; low-confidence |
| **DRI tables** | Alert thresholds | Public | ⚠️ **No machine-readable source — hand-transcribe** |
| **GI Tables 2021** | Glycemic load | Journal supplement | Map to FDC for ~500 common foods |

---

## The nutrient reference layer

Lives in [`data/nutrients.json`](../data/nutrients.json), typed by [`lib/nutrition/types.ts`](../lib/nutrition/types.ts) and validated against [`data/nutrients.schema.json`](../data/nutrients.schema.json). One entry per tracked value — 59 when complete; **47 written so far** (10 `full`, 37 `brief`). A brief entry carries a real, cited reference intake and a one-liner and may omit the prose; the schema enforces the difference and the UI badges it. See DECISIONS.md (D16).

Values in [`data/roster.json`](../data/roster.json) with no entry here are tracked and totalled, but render an explicit "no reference yet" state rather than a blank or a target. Writing the entry lights the row and its detail page up with no code change.

Two entry shapes, discriminated on `hasReferenceIntake`:

- **Tier 2** carries `reference: { ear, rda, ai, ul }` keyed by life-stage group.
- **Tier 3** carries `reference: null` and `intakeContext: { populationMedian, studiedRange, framing }` instead. The schema *enforces* this — it is structurally impossible to give a phytonutrient a target.

Every entry carries both simple-mode copy (`oneLiner`, `simpleExplanation`) and expert-mode copy (`summary`, `whatItDoes`, `absorption`, `interactions`), plus `deficiency`, `excess`, `topSources`, `citations`, and `lastReviewed`.

### `storage` — the field that makes alerts credible

| Class | Nutrients | Alert window |
|---|---|---|
| `none` — water-soluble, not stored | Vitamin C, B vitamins | 3-day streak |
| `moderate` | Magnesium, zinc, iron | 7-day rolling average |
| `high` — stores months to years | B12, A, D, E, K | 14–30 day rolling average |

Flagging "low B12 today" is noise; the liver holds years of it. A 30-day B12 trend is signal.

### `evidence` tiers

| Tier | Means |
|---|---|
| `strong` | Consistent RCT evidence or established physiological necessity |
| `moderate` | Multiple RCTs with mixed effect sizes, or agreeing mechanism + cohort data |
| `limited` | Small or unreplicated trials |
| `preliminary` | Observational or mechanistic only |

Every `benefits[]` entry carries one — the schema rejects entries that don't. Rendered as a badge in expert mode; collapsed to hedging language in simple mode ("may help with…" vs "helps with…"). This is the guardrail against drifting into wellness-grift territory.

### Seed entries

The five written entries were chosen to exercise every branch of the schema before the bulk writing begins:

| Entry | Exercises |
|---|---|
| **Magnesium** | Tier 2 mineral · `moderate` storage · supplemental-only UL |
| **Vitamin D** | Tier 2 vitamin · `high` storage · total UL with life-stage overrides · a `preliminary` claim contradicted by a large RCT (VITAL) |
| **Vitamin B12** | Tier 2 vitamin · `high` storage · **no UL at all** · a folate interaction that masks the deficiency |
| **Vitamin C** | Tier 2 vitamin · `none` storage · `antioxidantRole: true` · a documented *negative* finding (doesn't prevent colds) |
| **Lutein + zeaxanthin** | **Tier 3** · `reference: null` + `intakeContext` · phytonutrient invariants |

---

## Progressive disclosure (simple ↔ expert)

One interface, one codebase. `users.detail_level` = `simple` | `expert`, default `simple`.

| | Simple | Expert |
|---|---|---|
| Nutrients shown | ~24 headline | All 59 |
| Reference values | RDA only, as % | EAR / RDA / AI / UL side by side, absolute + % |
| Units | Rounded | Exact |
| Nutrient copy | `oneLiner` + `simpleExplanation` | `summary`, `whatItDoes`, `absorption`, `interactions` |
| Evidence | Softened language | Explicit tier badges |
| Statistics | "About right" | 7/30-day mean, σ, trend %, data completeness |
| Sources | Hidden | Citations + per-food FDC data-type provenance |
| Phytonutrients | "Antioxidants" summary card | Per-compound mg with `intakeContext` |
| Export | — | CSV / JSON of logs and daily totals |

**Never fork components.** Use `useDetailLevel()` plus `<ExpertOnly>` / `<SimpleOnly>`. Content variance lives in the data file, not in branching UI code. Expert mode is a strict superset — it reveals detail, it never rearranges or contradicts.

Researchers additionally get logging-completeness warnings ("3 of 21 meals unlogged this week — averages are biased low") and raw export.

---

## Data model

```
user             id, name, email, email_verified, image, created_at, updated_at
session/account  Better Auth-owned sessions and login credentials
user_profiles    user_id, sex, birth_date, weight_kg, height_cm,
                 activity_level, active_goal_modes, detail_level(simple|expert),
                 pregnancy_status

ai_credentials   user_id, provider, encrypted_key, key_source(oauth|manual),
                 base_url, model_id, created_at

foods            id, fdc_id, name, brand, source(fdc|off|custom),
                 fdc_data_type,            -- provenance for expert mode
                 nutrients jsonb,          -- per 100g, Tier 1+2
                 phytonutrients jsonb,     -- per 100g, Tier 3
                 gi, gl_per_100g, plant_species, verified

food_aliases     alias_text, food_id, hit_count      -- resolver cache

log_entries      id, user_id, logged_at, meal, food_id, quantity, unit,
                 resolved_nutrients jsonb,
                 source(photo|search|barcode|manual), ai_confidence, user_edited

daily_totals     user_id, date, totals jsonb, pct_rda jsonb, completeness
streaks          user_id, nutrient_id, type(deficiency|excess),
                 started_on, days, last_notified_at, dismissed_until
goal_modes       id, name, description, nutrient_weights jsonb,
                 flagged_attributes jsonb, evidence_note
```

`resolved_nutrients` is denormalized onto each log entry deliberately: food records get corrected over time, and snapshotting at log time keeps history stable.

---

## AI integration

### Auth — OpenRouter OAuth first, key paste second

**Primary: OpenRouter OAuth (PKCE).**

1. Generate `code_verifier`; derive `code_challenge` (S256)
2. Redirect → `https://openrouter.ai/auth?callback_url=…&code_challenge=…&code_challenge_method=S256`
3. User authorizes
4. Callback returns `code`
5. Exchange `code` + `code_verifier` → API key

One integration covers Claude, GPT, Gemini, Llama, Qwen and hundreds more.

**Fallback:** direct key paste (Anthropic / OpenAI / Google). Neither offers usable third-party OAuth — Anthropic has none, and "Sign in with ChatGPT" is identity-only and partner-gated.

**Optional:** local models via Ollama / LM Studio base URL. Safe because of the perception/database split, but mark those logs low-confidence and force confirmation.

**Key storage:** AES-256-GCM at rest, master key in env/KMS, never returned to the client, all inference proxied server-side. State this tradeoff plainly on the privacy page.

### The vision call

Structured outputs, so no prose parsing:

```jsonc
{
  "items": [{
    "description":  "plain food name, no brand unless visible on packaging",
    "quantity":     "number",
    "unit":         "g | ml | piece | cup | tbsp",
    "preparation":  "raw | grilled | fried | boiled | baked | unknown",
    "confidence":   "number 0-1",
    "portionBasis": "what you judged size against, e.g. 'relative to the fork'"
  }],
  "sceneNotes": "lighting or occlusion issues affecting the estimate"
}
```

- State explicitly: **"Do not estimate calories or nutrients. Identify foods and portions only."**
- `portionBasis` makes the model's size reasoning checkable.
- `sceneNotes` surfaces "half the plate is out of frame" instead of silent guessing.
- **Prompt-cache** the system prompt + schema — byte-identical every call, ~10% of base input cost on reads.

Defaults: `google/gemini-flash` or `anthropic/claude-haiku-4-5`; `anthropic/claude-opus-5` behind a high-accuracy toggle.

### Food-name resolution

1. Exact match on `food_aliases` (most repeat meals)
2. FDC full-text search, preferring Foundation > SR Legacy > Survey > Branded
3. Embedding similarity over the ~5,000 most common foods
4. User picker

Confirmations write back to `food_aliases`; the resolver improves with use.

---

## Feature specs

**1. Photo → AI logging.** Camera/upload → vision call → **draft review screen** → confirm → log. Every item editable, quantities on sliders with live gram equivalents, per-item confidence, low-confidence flagged, `sceneNotes` surfaced. Never auto-commit.

**2. Micronutrient dashboard.** Progress bars vs personalized RDA, color-coded through to over-UL. Grouped macros → vitamins → minerals → phytonutrients. Tap any nutrient for the full reference panel, including top sources *ranked by what you already eat*. Weekly/monthly views respecting storage class. Plant diversity counter.

**3. Streak alerts.** Nightly rolling averages per storage-class window. Deficiency: below 70% RDA → alert + three foods that close the gap. Excess: above UL → actual risk, no scare copy. **Max 2 alerts/day, 7-day cooldown per nutrient after dismissal.**

**4. Goal modes.**

| Mode | What changes |
|---|---|
| High protein | 1.6–2.2 g/kg target; leucine surfaced; per-meal distribution |
| Low bloat | Flags high-FODMAP, sugar alcohols, carbonation, high sodium; tracks fiber ramp rate |
| Lower glycemic / skin | Per-meal glycemic **load**; flags high-GL meals; emphasizes zinc + omega-3; optional dairy flag |
| General health | Default; balanced, plant-diversity emphasis |

Modes re-weight; they never hide data. **Each ships an evidence note.** Low-GI and dairy have *observational associations* with acne; FODMAP restriction has *good trial evidence* for bloating. Say which is which.

**5. Recommendations.** Rule-based, auditable, free. Deficiency-driven ("magnesium at ~60% for 8 days; 30 g pumpkin seeds covers 45% of the gap"), swaps ("white rice → quinoa: +2.8 g protein, +118 mg Mg, GI 73→53"), diversity nudges.

---

## Build phases

Day-to-day state, current issues, and what changed most recently live in [STATUS.md](STATUS.md). These boxes track the arc.

### Phase 0 — Data foundation
- [x] `CLAUDE.md`
- [x] TypeScript types + JSON Schema for the nutrient reference layer
- [x] 5 seed reference entries exercising every schema branch
- [x] `data/roster.json` — the 59-value index
- [x] Scaffold Next.js + TypeScript + Tailwind
- [x] `npm run validate:data` — schema plus cross-file agreement
- [ ] Postgres + Drizzle; schema and initial migration are built, hosted database still needs connecting
- [x] Run `validate:data` in CI
- [ ] Upgrade the 37 brief entries to full; write the 11 remaining Tier 3 phytonutrients
- [ ] FDC client + local mirror of Foundation Foods and SR Legacy; resolve `topSources[].fdcId`
- [ ] Import USDA flavonoid / isoflavone / proanthocyanidin DBs; import GI tables

### Phase 1 — Manual logging + dashboard *(useful with zero AI)*
- [x] Dashboard + nutrient detail panels *(against fixtures)*
- [x] Simple/expert toggle
- [ ] Auth + persisted profile are built; dashboard still needs to consume the signed-in profile
- [ ] Food search + manual entry; daily totals rollup *(UI built, nothing persists)*
- [ ] Unit conversion — ml / cup / tbsp / piece → g

**Ship this and use it for two weeks.** It'll teach more about the data model than further planning will.

### Phase 2 — AI logging
- [x] Draft review UI *(static)*
- [ ] OpenRouter OAuth PKCE + encrypted credential storage
- [ ] Key paste fallback; local-model endpoint
- [ ] Vision call, structured outputs, prompt caching, provider abstraction
- [ ] Resolver with alias cache

### Phase 3 — Streaks + alerts
- [x] Per-storage-class detection + streak cards *(against fixture history)*
- [ ] Nightly rolling-average job
- [ ] Web push + in-app cards; rate limiting, snooze, dismiss

### Phase 4 — Goal modes + recommendations
- [ ] Mode configs, re-weighting, evidence notes *(modes and their evidence notes exist; nothing re-weights yet)*
- [ ] Rule-based recommendation engine
- [ ] Barcode scanning via Open Food Facts

---

## Verification

| Area | How |
|---|---|
| **Schema** | Validate every entry against `nutrients.schema.json` in CI. Assert each `benefits[]` has an evidence tier and each Tier 2 entry has an RDA or AI. |
| **Nutrient math** | Unit-test scaling against 20 hand-verified foods — log 100 g chicken breast, assert against the FDC row exactly. Verify RDA personalization across sex and age boundaries. |
| **Storage-class alerting** | Synthetic 30-day logs with a deliberate magnesium shortfall — assert the 7-day window fires and the daily window doesn't. |
| **Tier 3 rendering** | Assert no phytonutrient ever renders a % or progress bar. |
| **Missing vs zero** | Assert a food with no flavonoid data renders "no data", never `0`, and decrements the day's coverage figure. |
| **Progressive disclosure** | Snapshot the dashboard in both modes; assert expert is a strict superset and no component is duplicated. |
| **AI pipeline** | ~30 meal photos with hand-measured ground truth. Track identification accuracy and portion error **separately** — they fail independently. Re-run on every prompt or model change. |
| **Cost** | Log token usage; confirm ~$0.002 per photo log on the default model. |
| **End-to-end** | Photograph a meal → draft with sane portions → edit one item → totals move correctly → persists offline and syncs. |

---

## Open risks

1. **Portion estimation is the accuracy ceiling**, not identification. The slider/reference-object UX matters more than model choice.
2. **BYOK is a signup cliff.** Even one-click OAuth needs an OpenRouter account with credit. Manual logging staying fully functional without AI is what stops this being fatal.
3. **59 reference entries is the moat and the grind.** Writing 5 first validated the schema before the bulk work — that ordering is the risk control, and it already caught two schema gaps (nullable `fdcId`, database-level `notes`).
4. **Health-claim framing.** Evidence tiers and visible disclaimers on the acne/bloating modes. "Associated with," never "cures."
5. **⚠️ Tier 3 data coverage.** USDA's flavonoid databases cover ~500 foods against FDC's 600,000. Most logged meals will have *no* flavonoid data. The UI must distinguish "you ate none" from "we don't have data" — conflating them produces alarming, wrong charts. Surface a per-day coverage percentage.
