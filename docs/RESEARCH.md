# Research Notes

Findings that shaped the plan, with sources. Re-check anything marked ⚠️ before relying on it.

---

## 1. Nutrient data sources

### USDA FoodData Central — the backbone

The core nutrient database. 600,000+ foods, ~150 nutrients per food.

| | |
|---|---|
| **License** | CC0 1.0 Universal — public domain. No attribution required, commercial use fine. |
| **Access** | Free API key from api.data.gov. `DEMO_KEY` works for testing but is heavily throttled. |
| **Rate limit** | ⚠️ **1,000 requests/hour** per key. Too low to serve live traffic. |
| **Updates** | Foundation Foods twice yearly; Branded Foods monthly. |

**Data types, in descending order of trustworthiness:**

1. **Foundation Foods** — newest, most rigorous lab analysis, full nutrient profiles. Prefer these.
2. **SR Legacy** — the classic Standard Reference dataset. Broad coverage, well-validated.
3. **Survey (FNDDS)** — foods as actually eaten, includes mixed dishes.
4. **Branded** — manufacturer-submitted label data. Macros only in most cases; micronutrients usually absent.

**Implication for the build:** bulk-download and mirror Foundation Foods + SR Legacy locally. Use the live API only for branded/barcode lookups. The rate limit makes a mirror mandatory, not optional.

- [FoodData Central API guide](https://calorieapi.com/blog/usda-fooddata-central-api-guide)
- [FoodData Central provider listing](https://apis.io/providers/fooddata/)

### Open Food Facts — barcodes

| | |
|---|---|
| **License** | ⚠️ **ODbL** — Open Database License. Commercial use permitted, but carries **attribution and share-alike obligations on the database itself.** Read this before shipping commercially. |
| **Access** | No API key, no signup. `https://world.openfoodfacts.org/api/v2/product/{barcode}.json` |
| **Quality** | ⚠️ Crowdsourced and unverified. A 2026 analysis noted it returns clean `200`s with wrong answers on invalid barcodes. |

Treat every OFF result as low-confidence and always route it through user confirmation.

- [Open Food Facts API docs](https://openfoodfacts.github.io/openfoodfacts-server/api/)
- [Open Food Facts data page](https://world.openfoodfacts.org/data)

### Dietary Reference Intakes (RDA / AI / UL)

These are the thresholds that drive every deficiency and excess alert — the most important data in the app.

⚠️ **No machine-readable dataset exists.** Searched thoroughly; the DRI tables are published as PDFs and web pages only. NIH ODS, ODPHP, and Health Canada all publish them, none as CSV/JSON.

**This must be hand-transcribed** into `data/nutrients.json`. ~35 nutrients × life-stage groups (age × sex, plus pregnancy/lactation). Roughly one focused day of work.

The four values to capture per nutrient per group:

| Term | Meaning |
|---|---|
| **EAR** | Estimated Average Requirement — meets the needs of 50% of the group |
| **RDA** | Recommended Dietary Allowance — meets the needs of ~97.5%. This is your primary target. |
| **AI** | Adequate Intake — used where evidence is insufficient to set an RDA |
| **UL** | Tolerable Upper Intake Level — the ceiling for the excess alerts |

Note: some ULs apply only to supplemental forms (magnesium's 350mg UL is supplements-only; dietary magnesium has no UL). Capture that distinction or you'll fire false alarms.

- [NIH ODS — Nutrient Recommendations and Databases](https://ods.od.nih.gov/HealthInformation/nutrientrecommendations.aspx)
- [ODPHP — Dietary Reference Intakes](https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines/dietary-reference-intakes)
- [Health Canada DRI tables (PDF)](https://www.canada.ca/content/dam/hc-sc/migration/hc-sc/fn-an/alt_formats/hpfb-dgpsa/pdf/nutrition/dri_tables-eng.pdf)
- [DRI reference on NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK222890/)

### Glycemic Index

**International Tables of Glycemic Index and Glycemic Load Values 2021** (4th edition, AJCN) is the canonical source.

- 4,000+ individual food items; 2,091 highest-quality values derived by the ISO-recommended methodology, across 21 food categories.
- Published as journal supplementary data — extract to CSV, then map to FDC IDs for the ~500 most commonly logged foods.
- The University of Sydney also maintains a searchable database at glycemicindex.com.

**Use glycemic *load*, not glycemic index, in the UI.** GI describes a food in isolation at a fixed 50g-carb dose; GL accounts for the actual portion eaten. For meal-level insight GL is the meaningful number.

- [International tables of GI and GL values 2021 (AJCN)](https://ajcn.nutrition.org/article/S0002-9165(22)00494-4/fulltext)
- [PubMed record](https://pubmed.ncbi.nlm.nih.gov/34258626/)

---

## 2. Antioxidants — do not build an ORAC score

⚠️ **This is the most important correction in this document.**

The USDA **removed** its ORAC (Oxygen Radical Absorbance Capacity) Database for Selected Foods from its website in 2012. The stated reason: mounting evidence that ORAC values **have no relevance to the effects of specific bioactive compounds on human health.** ORAC measures antioxidant capacity in a test tube; that number does not survive digestion, absorption, or metabolism.

The values persist across the supplement industry and wellness content because they make good marketing. Shipping an "antioxidant score" built on them would undermine the credibility of everything else in the app.

### "Antioxidants" are two different things

The word covers two categories that must be modeled differently. Conflating them is what produces incoherent antioxidant features.

**A. Essential nutrients with antioxidant roles** — vitamin C, vitamin E, selenium, manganese, zinc, copper. These have RDAs and ULs, live in Tier 2 alongside every other essential nutrient, and are tracked as % of target like anything else. They are flagged `antioxidantRole: true` so an Antioxidants view can gather them, but they are **not a separate system**.

**B. Phytonutrients** — carotenoids and flavonoids. No RDA, no deficiency disease, no ceiling. Tier 3. Tracked as absolute intake and trend, never as a percentage of anything.

**Defensible replacements for an ORAC score:**

1. **Named carotenoids** — lutein, zeaxanthin, lycopene, α-carotene, β-carotene, β-cryptoxanthin. Real compounds, real measured quantities, **already inside FoodData Central** — no extra source needed.
2. **Flavonoids via USDA's special-interest databases** (see below). Report as mg by subclass, never as an index.
3. **Plant diversity score** — distinct plant species per week, targeting ~30. Grounded in gut microbiome research, computed entirely from your own log data, and the most motivating of the three as a UI element.

### Flavonoid data — USDA's three databases

USDA publishes these separately from FoodData Central. All are public domain and **already keyed to FDC IDs**, which removes a large mapping job and avoids Phenol-Explorer's licensing questions.

| Database | Release | Coverage |
|---|---|---|
| **Flavonoid Content of Selected Foods** | 3.3 (2018) | 506 foods, 26 flavonoids across 5 subclasses (flavonols, flavones, flavanones, flavan-3-ols, anthocyanidins) |
| **Isoflavone Content of Selected Foods** | 2.1 (2015) | 560 foods — daidzein, genistein, glycitein, total |
| **Proanthocyanidin Content of Selected Foods** | 2.1 (2018) | 285 foods |

⚠️ **They are three separate downloads for a reason.** Isoflavones and proanthocyanidins are deliberately excluded from the main flavonoid database. Merging them requires care — don't assume one file has everything.

⚠️ **Distributed as MS Access `.mdb` files.** Budget conversion work; `mdbtools` handles this on non-Windows.

**Phenol-Explorer** stays in the plan, demoted to gap-filling: broader (35,000+ values, 500 polyphenols, 400+ foods, plus cooking/processing effects) but requires manual FDC mapping and carries its own license terms.

⚠️ **The coverage problem, which is the real risk here.** These databases cover ~500 foods. FoodData Central has 600,000. **Most logged meals will have no flavonoid data at all.** The UI must distinguish "you ate zero anthocyanins" from "we have no data for this food" — conflating them produces charts that are alarming and wrong. Surface a per-day data-coverage percentage.

- [Was the USDA right to drop its online ORAC database?](https://www.nutraingredients.com/Article/2012/06/15/Was-USDA-right-to-drop-its-online-ORAC-database/)
- [USDA says ORAC tests useless, removes database](https://www.supplysidesj.com/claims/usda-says-orac-tests-useless-removes-database-for-selected-foods)
- [USDA Flavonoid Database Release 3.3 (PDF)](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/Flav/Flav3.3.pdf)
- [USDA Special Interest Database on Isoflavones](https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/methods-and-application-of-food-composition-laboratory/mafcl-site-pages/isoflavone/)
- [USDA Special Interest Database on Proanthocyanidins](https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/methods-and-application-of-food-composition-laboratory/mafcl-site-pages/proanthocyanidin/)
- [Phenol-Explorer](http://phenol-explorer.eu/)
- [Phenol-Explorer 3.0 paper (Database, Oxford)](https://academic.oup.com/database/article/doi/10.1093/database/bat070/342410)

---

## 3. AI provider authentication — the "click a link to sign in" question

**Question:** can users connect their AI account by clicking a link, the way Claude Code and Codex do, rather than pasting an API key?

**Answer: yes, through OpenRouter. No, through the providers directly.**

### ✅ OpenRouter — OAuth PKCE (recommended primary path)

OpenRouter implements an OAuth PKCE flow built specifically for this: the user is redirected to OpenRouter, authorizes your app, and is sent back with a code you exchange for an API key. Exactly the SSO experience described.

```
1. Generate code_verifier; derive code_challenge (S256)
2. Redirect → https://openrouter.ai/auth
       ?callback_url=<your callback>
       &code_challenge=<challenge>
       &code_challenge_method=S256
3. User logs in and authorizes
4. Redirect back with ?code=...
5. POST code + code_verifier → receive API key
```

PKCE is designed for clients that can't safely hold a secret (SPAs, mobile), so no client registration or backend secret is required.

**Why this is the right call:** one integration covers Claude, GPT, Gemini, Llama, Qwen, DeepSeek and several hundred other models, with the user choosing per request. It solves the multi-provider requirement and the sign-in-link requirement simultaneously.

- [OpenRouter OAuth PKCE docs](https://openrouter.ai/docs/guides/overview/auth/oauth)
- [OpenRouter TypeScript SDK — OAuth](https://openrouter.ai/docs/sdks/typescript/api-reference/oauth)

### ❌ Anthropic — no third-party OAuth

Anthropic does not allow third-party apps to use OAuth to access Claude models. The sign-in flow in Claude Code is Anthropic's own first-party client; that path is not open to outside applications.

There is one long-lived token (`sk-ant-oat01-…`) obtainable via `claude setup-token` for Pro/Max/Team/Enterprise subscribers, but it is intended for CI pipelines and GitHub Actions — not for distributing to your users.

For NutriTracker: **API key paste only**, or route through OpenRouter.

- [How to do OAuth with Claude](https://developer.puter.com/tutorials/claude-oauth/)

### ❌ OpenAI — "Sign in with ChatGPT" is identity, not API access

Launched 2 August 2026 as a live beta with six partners (Airtable, GitLab, HubSpot, Notion, Supabase, Vercel). Built on OAuth 2.0.

⚠️ **It grants your app three things: name, email, profile picture.** It is the equivalent of "Sign in with Google" — an identity layer. It does **not** grant API access on the user's ChatGPT plan, and it is restricted to named launch partners.

OpenAI's Codex OAuth (which does grant subscription model access) is first-party only.

For NutriTracker: **API key paste only**, or route through OpenRouter.

- [Sign in with ChatGPT launch coverage](https://www.techtimes.com/articles/322791/20260803/sign-chatgpt-launches-what-openai-retains-not-what-gets-shared.htm)
- [Community request thread — "Login with ChatGPT" for 3rd-party apps](https://community.openai.com/t/login-with-chatgpt-allow-users-to-use-their-own-plus-subscription-in-3rd-party-apps/1378506)

### Summary

| Provider | Click-to-connect | Notes |
|---|---|---|
| **OpenRouter** | ✅ OAuth PKCE | **Use this.** One integration → all major models. |
| Anthropic | ❌ | Key paste only. First-party OAuth is not open to third parties. |
| OpenAI | ❌ | "Sign in with ChatGPT" is identity-only, partner-gated. |
| Google | ❌ | Key paste only in practice. |
| Local (Ollama / LM Studio) | n/a | Base URL, no auth. |

---

## 4. AI food-logging accuracy

⚠️ **Source-quality caveat:** searches on this topic surface a lot of SEO content from calorie-app vendors, including implausible claims (one site advertises "±1.3% MAPE," which is not a credible figure for portion estimation from a photo). The findings below are limited to what's consistent across independent sources.

**What holds up:**

- A 2025 randomized controlled trial of an AI image-recognition meal-reporting app, run in authentic restaurant conditions with young adults, found **86% of dishes correctly identified** but only **68% accurately reported end-to-end** once portion entry was included.
- **Portion estimation — not food identification — is the dominant error source.** This is the single most consistent finding across the literature.
- A 2025 scoping review in *Frontiers in Nutrition* found performance varies widely between studies; real-world accuracy depends heavily on dataset diversity, food complexity, lighting, and **whether the app lets the user correct the output.**
- The standard pipeline is: segmentation → classification → portion estimation (often against a reference object) → nutrient database lookup.

**Design consequences:**

1. **The confirmation step is not optional.** AI output is a pre-filled draft, never a committed log. This is the difference between ~68% and something usable.
2. **Invest UI effort in portion correction** — sliders with gram equivalents, common household measures, visible confidence — over chasing a better model. The ceiling is portions, not identification.
3. **Ask the model to show its portion reasoning** (`portionBasis`: "estimated relative to the fork") so the user knows what to check.
4. **Prompt for a reference object.** "Include a hand or utensil for scale" measurably improves the estimate.
5. **Build a fixed regression set** — ~30 meal photos with hand-measured ground truth. Track identification accuracy and portion error as separate metrics; they fail independently. Re-run on every prompt or model change.

- [Calorie estimation from pictures of food: crowdsourcing study (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6246963/)
- [How AI photo recognition for food actually works — and where it still goes wrong](https://thecuratedweekly.com/health/ai-photo-calorie-recognition-explained-2026/)

---

## 5. Model selection and cost

The perception/database split means the model only needs to identify foods and estimate portions — it never produces nutrient values. That drops the capability bar substantially and makes cheap models viable.

| Model | Input / Output per MTok | Role |
|---|---|---|
| `google/gemini-flash` | ~$0.10 / $0.40 | Default. Fast, cheap, adequate for food ID. |
| `anthropic/claude-haiku-4-5` | $1.00 / $5.00 | Default alternative. |
| `anthropic/claude-opus-5` | $5.00 / $25.00 | Optional "high accuracy" toggle for complex or ambiguous plates. |

**Rough cost per photo log:** an image runs ~1,600 tokens, plus a system prompt and schema of a few hundred. On Haiku 4.5 that lands near **$0.002 per log** — under a dollar for a year of daily logging. Worth surfacing in the BYOK onboarding, because "bring your own key" sounds expensive until you see the number.

**Two optimizations to build in from the start:**

- **Prompt caching** on the system prompt + JSON schema. They're byte-identical across every request, so cache reads cost ~10% of base input price.
- **Structured outputs** rather than parsing prose. Guarantees a schema-valid response and removes an entire class of parsing bugs.

**On local models:** safe to allow, *because of the perception/database split* — a small local model can misidentify a food, but it cannot fabricate a nutrient value. Gate it honestly: flag those logs as low-confidence, force the confirmation step with no quick-accept, and show a one-time notice that small local models misidentify foods more often.
