# NutriTracker

A nutrition tracker that treats micronutrients, phytonutrients, and glycemic load as first-class data — not an afterthought behind a paywall.

Most trackers stop at calories and macros. This one tracks 59 values against personalized reference intakes, explains what each one actually does, notices when you've been short on something for a week, and adapts what it emphasizes based on what you're trying to achieve.

Logging is done by photographing your meal. You bring your own AI access, so there's no subscription and no per-user cost to run.

## What makes it different

- **59 values tracked** — 18 macronutrients, 29 micronutrients with reference intakes, and 12 phytonutrients — each with a written reference panel: what it does, what deficiency looks like, what excess looks like, absorption notes, interactions, and food sources ranked against your own eating patterns.
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
| [docs/STATUS.md](docs/STATUS.md) | Where things actually stand — what's next, what's broken, what changed |
| [docs/PLAN.md](docs/PLAN.md) | Architecture, nutrient roster, data model, feature specs, build phases |
| [docs/DECISIONS.md](docs/DECISIONS.md) | What's settled and why, plus what's still open |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Data sources, licenses, AI provider auth findings, accuracy research |

## Data layer

| File | Contents |
|---|---|
| [data/roster.json](data/roster.json) | The index of all 59 tracked values — metadata only |
| [data/nutrients.json](data/nutrients.json) | Reference panels — 10 of 59 written |
| [data/nutrients.schema.json](data/nutrients.schema.json) | JSON Schema enforcing the integrity rules |
| [lib/nutrition/types.ts](lib/nutrition/types.ts) | TypeScript types for the reference layer |
| [data/demo/](data/demo/) | Fixtures standing in for the database. Importable only through `lib/demo`. |

The schema makes the important rules structural rather than advisory: a benefit claim without an evidence tier fails validation, and a phytonutrient is *unable* to carry a reference intake, so nothing downstream can render it as a percentage of a target that doesn't exist. `npm run validate:data` adds the checks a schema can't express — that the roster and the reference entries agree, and that every cross-reference resolves.

## Status

**Phase 0, part-built.** The UI is complete and runnable against fixtures; there's no database and no AI yet. Current state, next steps and known issues: [docs/STATUS.md](docs/STATUS.md).

## Start here

```bash
git clone https://github.com/martinw500/Nutritracker
cd Nutritracker
npm install
npm run dev            # http://localhost:3000
```

No `.env.local` and no database needed — every screen runs off `data/demo/`, and a banner says so on every page.

```bash
npm run validate:data  # data layer
npm test               # 99 unit and render tests
```

**Read in this order:** [CLAUDE.md](CLAUDE.md) → [docs/DECISIONS.md](docs/DECISIONS.md) → [docs/PLAN.md](docs/PLAN.md) → [docs/STATUS.md](docs/STATUS.md). What you may not break, why, what to build, where it stands.

You'll need a free [FoodData Central API key](https://fdc.nal.usda.gov/api-key-signup.html) and a Postgres database (Supabase and Neon both have free tiers) before Phase 0 finishes — see [.env.example](.env.example) for everything and where it comes from.
