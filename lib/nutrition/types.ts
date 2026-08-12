/**
 * Type definitions for the nutrient reference layer (`data/nutrients.json`).
 *
 * Two entry shapes, discriminated on `hasReferenceIntake`:
 *
 *   Tier 2 (`hasReferenceIntake: true`)  — essential nutrients with an RDA or AI.
 *                                          Rendered as % of target. Drives streak alerts.
 *   Tier 3 (`hasReferenceIntake: false`) — phytonutrients with no official requirement.
 *                                          Rendered as absolute amounts only.
 *
 * See CLAUDE.md for the rules governing this data. In particular: a Tier 3
 * nutrient must never render as a percentage, because there is no target to be
 * a percentage of.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Life-stage group key. Convention: `{group}_{ageLow}_{ageHigh}`, with `plus`
 * for open-ended upper bounds.
 *
 *   "male_19_30" | "female_51_plus" | "child_4_8" | "pregnancy_19_30"
 *
 * Child groups are sex-neutral below age 9, matching how the DRI tables are
 * published.
 */
export type LifeStageKey = string;

/** Reference values keyed by life-stage group. Partial — not every nutrient
 *  publishes a value for every group. */
export type ReferenceTable = Partial<Record<LifeStageKey, number>>;

/**
 * Strength of evidence behind a claim. Drives both an expert-mode badge and the
 * hedging in simple-mode copy. Every entry in `benefits[]` must carry one.
 */
export type EvidenceTier =
  /** Consistent RCT evidence, or established physiological necessity. */
  | "strong"
  /** Multiple RCTs with mixed effect sizes, or agreeing mechanism + cohort data. */
  | "moderate"
  /** Small, unreplicated, or methodologically weak trials. */
  | "limited"
  /** Observational or mechanistic only; no interventional support. */
  | "preliminary";

/**
 * How long the body holds a reserve. Determines the alert window — this is what
 * keeps deficiency alerts from becoming noise.
 *
 *   none     → not stored (water-soluble). 3-day streak triggers.
 *   moderate → days-to-weeks of reserve.   7-day rolling average.
 *   high     → months-to-years of reserve. 14–30 day rolling average.
 */
export type StorageClass = "none" | "moderate" | "high";

export type NutrientCategory =
  | "macronutrient"
  | "vitamin"
  | "mineral"
  | "phytonutrient"
  | "other";

export type Essentiality =
  | "essential"
  /** Required only under specific conditions (illness, life stage, genotype). */
  | "conditionally-essential"
  /** Beneficial but not required — the phytonutrients. */
  | "non-essential";

export interface Citation {
  label: string;
  url: string;
}

/** A claimed benefit. `evidence` is mandatory — see CLAUDE.md rule 2. */
export interface Benefit {
  claim: string;
  evidence: EvidenceTier;
  /** Where the tier comes from: trial names, effect sizes, contradictory results. */
  note: string;
}

export interface FoodSource {
  /**
   * FoodData Central ID, so the UI can deep-link to the real record.
   *
   * Null until resolved against the local FDC mirror during Phase 0 import.
   * Hand-written IDs are a trap — a wrong one silently links to the wrong food,
   * which is worse than no link. Leave null and let the importer fill it in.
   */
  fdcId: number | null;
  name: string;
  /**
   * Amount per 100 g, in the nutrient's own `unit`.
   *
   * Values authored by hand are approximate and flagged in the database's
   * `notes`. The Phase 0 importer overwrites them with exact FDC figures.
   */
  per100g: number;
  /** Realistic serving, for "one handful covers 45% of the gap" style copy. */
  typicalServing: string;
}

export interface NutrientInteraction {
  /** `id` of another nutrient in this file. */
  with: string;
  direction: "competes" | "synergy" | "depletes" | "requires";
  effect: string;
}

export interface AbsorptionInfo {
  /** Human-readable range, e.g. "30–40% of intake". */
  typicalRate: string;
  enhancers: string[];
  inhibitors: string[];
  notes: string;
}

export interface DeficiencyInfo {
  /** Clinical term, where one exists. */
  clinicalName: string | null;
  /** Population prevalence with its source, e.g. NHANES. */
  prevalence: string;
  earlySigns: string[];
  advancedSigns: string[];
  riskGroups: string[];
}

export interface ExcessInfo {
  /** Almost always "not observed from food" — say so explicitly. */
  fromFood: string;
  fromSupplements: string[];
  clinicalName: string | null;
  severeRisk: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference intakes (Tier 2 only)
// ─────────────────────────────────────────────────────────────────────────────

export interface UpperLimit {
  value: number;
  /**
   * Some ULs apply only to supplemental forms — magnesium's 350 mg ceiling is
   * supplements-only, and dietary magnesium has no UL at all. Applying a
   * supplemental UL to food intake generates false excess alerts.
   */
  appliesTo: "total" | "supplemental" | "fortified-and-supplemental";
  note: string | null;
  /** Per-life-stage overrides where the UL varies by age. */
  byLifeStage?: ReferenceTable;
}

/**
 * Acceptable Macronutrient Distribution Range — a band given as a percentage of
 * total energy rather than an absolute amount.
 *
 * Only the macronutrients are published this way. It matters because total fat
 * has no RDA and no AI at all: without this it could carry no reference, and
 * the only honest alternative would be to show no target for a third of the
 * energy on the plate. Rendered as a shaded band behind the bar, never as a
 * point target — the range is what the evidence supports.
 */
export interface AcceptableRange {
  lowPct: number;
  highPct: number;
  note: string;
}

export interface ReferenceIntakes {
  /** Estimated Average Requirement — meets 50% of the group. Expert mode only. */
  ear: ReferenceTable | null;
  /** Recommended Dietary Allowance — meets ~97.5%. The primary target. */
  rda: ReferenceTable | null;
  /** Adequate Intake — used where evidence is too thin for an RDA. */
  ai: ReferenceTable | null;
  /** Tolerable Upper Intake Level. Drives excess alerts. */
  ul: UpperLimit | null;
  /** Percent-of-energy band. Macronutrients only; absent elsewhere. */
  amdr?: AcceptableRange | null;
  /**
   * Which reference the user should steer by. Defaults to `target`.
   *
   * `limit` marks the nutrients where more is not better and the ceiling is the
   * whole point. Sodium is the case: its AI is 1,500 mg, but showing "84% of
   * target" to someone eating 1,266 mg reads as a nudge to eat more salt, which
   * is the opposite of every piece of advice on the subject.
   */
  primaryGuide?: "target" | "limit";
}

// ─────────────────────────────────────────────────────────────────────────────
// Intake context (Tier 3 only)
// ─────────────────────────────────────────────────────────────────────────────

export interface IntakeAmount {
  value: number;
  unit: string;
  source: string;
}

export interface StudiedRange {
  low: number;
  high: number;
  unit: string;
  /** Which trials, and what outcome the range relates to. */
  note: string;
}

/**
 * Replaces `ReferenceIntakes` for phytonutrients. Deliberately not called
 * "target" — these are descriptive figures for context, and the UI must present
 * them as such.
 */
export interface IntakeContext {
  /** What people actually consume, so a user can situate their own intake. */
  populationMedian: IntakeAmount;
  /** Range used in studies that found an effect. Not a recommendation. */
  studiedRange: StudiedRange | null;
  /** Disclaimer rendered alongside the figures. Required. */
  framing: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nutrient entries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How complete an entry is.
 *
 *   full  — the whole reference panel is written.
 *   brief — a real, cited reference intake and a one-liner, with the prose
 *           still to come.
 *
 * `brief` exists because the alternative was worse. Writing 59 full panels
 * before any of them can show a target left 49 nutrients rendering as blanks,
 * which read as broken rather than as unfinished. A brief entry gives a
 * personalised, cited target today and is badged so nobody mistakes it for a
 * complete write-up. It is a stated state, not a silent gap.
 */
export type EntryDepth = "brief" | "full";

/**
 * The prose half of a reference panel. Present on every `full` entry, absent
 * on `brief` ones — absent, never blank. An empty string here would render as
 * a heading with nothing under it, which is exactly the impression `brief` is
 * meant to avoid.
 */
export interface NutrientContent {
  /** 2–4 sentences a non-specialist can act on. */
  simpleExplanation: string;
  /** Technical summary. Assumes biochemistry vocabulary. */
  summary: string;
  /** Concrete physiological roles, one per line. */
  whatItDoes: string[];
  benefits: Benefit[];
  deficiency: DeficiencyInfo;
  excess: ExcessInfo;
  absorption: AbsorptionInfo;
  interactions: NutrientInteraction[];
  topSources: FoodSource[];
}

interface NutrientBase extends Partial<NutrientContent> {
  depth: EntryDepth;
  /** Stable kebab-case identifier. Used as a foreign key across the app. */
  id: string;
  name: string;
  /** Chemical symbol or common abbreviation. Null where none applies. */
  symbol: string | null;
  /** Unit all amounts for this nutrient are expressed in: "mg" | "mcg" | "g" | "IU". */
  unit: string;
  category: NutrientCategory;
  subcategory: string | null;
  /** FoodData Central nutrient number, for joining to composition data. */
  fdcNutrientId: number | null;
  essentiality: Essentiality;
  storage: StorageClass;
  /**
   * True for nutrients with a recognized antioxidant role. Lets the Antioxidants
   * view gather across tiers WITHOUT computing a composite score — see CLAUDE.md
   * rule 4.
   */
  antioxidantRole: boolean;

  /**
   * One sentence, no jargon. Required on every entry at both depths — it is
   * the minimum a nutrient must say for itself to appear on the dashboard.
   */
  oneLiner: string;

  citations: Citation[];
  /** ISO date. Bump whenever content changes — see CLAUDE.md rule 6. */
  lastReviewed: string;
}

/** Essential nutrient with an official reference intake. */
export interface ReferenceNutrient extends NutrientBase {
  hasReferenceIntake: true;
  reference: ReferenceIntakes;
  intakeContext?: never;
}

/** Phytonutrient with no official requirement. Never rendered as a percentage. */
export interface ContextualNutrient extends NutrientBase {
  hasReferenceIntake: false;
  reference: null;
  intakeContext: IntakeContext;
}

export type Nutrient = ReferenceNutrient | ContextualNutrient;

export interface NutrientDatabase {
  /** Schema version, for migrating the data file. */
  version: string;
  lastUpdated: string;
  /** Caveats about the current state of the data — provenance, known gaps. */
  notes: string[];
  nutrients: Nutrient[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Narrows to a nutrient that can legitimately be shown as a percentage of a
 * target. Gate every progress-bar render on this — see CLAUDE.md rule 3.
 */
export function hasTarget(n: Nutrient): n is ReferenceNutrient {
  return n.hasReferenceIntake;
}

export function isPhytonutrient(n: Nutrient): n is ContextualNutrient {
  return !n.hasReferenceIntake;
}

/**
 * Narrows to an entry whose prose is written.
 *
 * Gate every render of `simpleExplanation`, `summary`, `benefits`, `deficiency`
 * and friends on this. A brief entry has a real target and a one-liner and
 * nothing else, and the panel must say so rather than showing empty headings.
 */
export function isFullEntry(n: Nutrient): n is Nutrient & NutrientContent {
  return n.depth === "full";
}
