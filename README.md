# NutriTracker

A nutrition tracker that treats micronutrients, phytonutrients, and glycemic load as first-class data — not an afterthought behind a paywall.

Most trackers stop at calories and macros. This one tracks ~35 nutrients against personalized reference intakes, explains what each one actually does, notices when you've been short on something for a week, and adapts what it emphasizes based on what you're trying to achieve.

Logging is done by photographing your meal. You bring your own AI access, so there's no subscription and no per-user cost to run.

## What makes it different

- **~57 values tracked** — 16 macronutrients, 29 micronutrients with reference intakes, and 12 phytonutrients — each with a written reference panel: what it does, what deficiency looks like, what excess looks like, absorption notes, interactions, and food sources ranked against your own eating patterns.
- **Streak detection** — "you've run low on magnesium for 8 days" — with alert windows tuned per nutrient. Daily shortfall matters for vitamin C; it's meaningless for B12, which your liver stores for years.
- **Works for both audiences.** One interface, simple by default. An expert toggle reveals EAR/AI/UL alongside RDA, exact values, evidence tiers, per-food data provenance, and CSV export. Expert mode is a strict superset — it reveals detail, never contradicts.
- **Goal modes** — high protein, low bloat, lower glycemic — that re-weight the dashboard and recommendations without hiding data.
- **Honest science.** No ORAC score (USDA withdrew that database as meaningless in 2012) and no composite "antioxidant score" of any kind. Named carotenoids, measured flavonoids, and plant diversity instead. Every health claim is labeled with an evidence tier, negative findings included — vitamin C doesn't prevent colds, and the app says so.

## The core design decision

**The AI does perception. The database does nutrition.**

The vision model is asked *"what foods are here, and roughly how much?"* — never *"how much zinc is in this?"* Every nutrient value comes from USDA FoodData Central.

This means a weak model misidentifies a food (visible and correctable) instead of inventing a nutrient value (invisible and wrong). It's why cheap models and even local models are safe to use here, and why a photo log costs about $0.002.

## Bring your own AI

- **One-click:** connect via OpenRouter OAuth — gets you Claude, GPT, Gemini, Llama, and hundreds more through one integration.
- **Manual:** paste an Anthropic / OpenAI / Google API key.
- **Local:** point at an Ollama or LM Studio endpoint.

Manual logging works fully without any AI configured, so the app is useful before you connect anything.

## Docs

| Document | Contents |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Data-integrity rules that bind implementation. Read before changing anything. |
| [docs/PLAN.md](docs/PLAN.md) | Architecture, nutrient roster, data model, feature specs, build phases |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Data sources, licenses, AI provider auth findings, accuracy research |

## Data layer

| File | Contents |
|---|---|
| [data/nutrients.json](data/nutrients.json) | Nutrient reference data — 5 of ~45 entries written |
| [data/nutrients.schema.json](data/nutrients.schema.json) | JSON Schema enforcing the integrity rules |
| [lib/nutrition/types.ts](lib/nutrition/types.ts) | TypeScript types for the reference layer |

The schema makes the important rules structural rather than advisory: a benefit claim without an evidence tier fails validation, and a phytonutrient is *unable* to carry a reference intake, so nothing downstream can render it as a percentage of a target that doesn't exist.

## Status

**Phase 0, in progress.** The nutrient reference layer is designed and seeded; the app itself isn't scaffolded yet.

- [x] Data-integrity rules, schema, and types
- [x] 5 seed nutrient entries (magnesium, vitamin D, B12, vitamin C, lutein+zeaxanthin) chosen to exercise every schema branch
- [ ] Next.js + Postgres + Drizzle scaffold
- [ ] Remaining ~40 nutrient entries
- [ ] FoodData Central mirror

See [docs/PLAN.md](docs/PLAN.md) for the full sequence.
