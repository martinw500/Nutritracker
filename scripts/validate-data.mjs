/**
 * Validates the data layer. Run with `npm run validate:data`.
 *
 * The JSON Schema covers the shape of nutrients.json. This script covers the
 * things a schema cannot: agreement BETWEEN files. Those are the failures that
 * would otherwise surface as a blank row in the UI or a nutrient that silently
 * resolves to nothing.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

const errors = [];
const fail = (message) => errors.push(message);

const schema = read("data/nutrients.schema.json");
const database = read("data/nutrients.json");
const roster = read("data/roster.json");
const foods = read("data/demo/foods.json");
const day = read("data/demo/day.json");
const history = read("data/demo/history.json");
const draft = read("data/demo/photo-draft.json");

// ── 1. nutrients.json against its schema ────────────────────────────────────
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(database)) {
  for (const error of validate.errors ?? []) {
    fail(`nutrients.json${error.instancePath} ${error.message}`);
  }
}

// ── 2. Integrity rules the schema cannot express ────────────────────────────
for (const nutrient of database.nutrients) {
  const where = `nutrients.json[${nutrient.id}]`;

  for (const [index, benefit] of (nutrient.benefits ?? []).entries()) {
    if (!benefit.evidence) {
      fail(`${where}.benefits[${index}] has no evidence tier (CLAUDE.md rule 2)`);
    }
  }

  if (nutrient.hasReferenceIntake) {
    const reference = nutrient.reference ?? {};
    // Total fat has no RDA and no AI — an AMDR band is its only reference.
    const hasTarget = reference.rda || reference.ai || reference.amdr;
    if (!hasTarget) {
      fail(`${where} has a reference intake but no RDA, AI or AMDR to render against`);
    }
    if (reference.amdr && reference.amdr.lowPct >= reference.amdr.highPct) {
      fail(`${where} has an AMDR whose low bound is not below its high bound`);
    }
    if (reference.amdr && nutrient.category !== "macronutrient") {
      fail(`${where} carries an AMDR but is not a macronutrient`);
    }
  } else {
    if (nutrient.reference !== null) {
      fail(`${where} is a phytonutrient but carries a reference intake (CLAUDE.md rule 3)`);
    }
    if (!nutrient.intakeContext?.framing) {
      fail(`${where} is a phytonutrient with no intakeContext.framing`);
    }
  }

  if (!nutrient.citations?.length) fail(`${where} has no citations (CLAUDE.md rule 6)`);
  if (!nutrient.lastReviewed) fail(`${where} has no lastReviewed date`);
}

// ── 3. roster.json is internally sound ──────────────────────────────────────
const rosterById = new Map();
for (const meta of roster.roster) {
  if (rosterById.has(meta.id)) fail(`roster.json has duplicate id "${meta.id}"`);
  rosterById.set(meta.id, meta);

  if (![1, 2, 3].includes(meta.tier)) {
    fail(`roster.json[${meta.id}] has invalid tier ${meta.tier}`);
  }
  if (meta.tier === 3 && meta.category !== "phytonutrient") {
    fail(`roster.json[${meta.id}] is Tier 3 but category is "${meta.category}"`);
  }
  if (!["none", "moderate", "high"].includes(meta.storage)) {
    fail(`roster.json[${meta.id}] has invalid storage class "${meta.storage}"`);
  }
}

// ── 4. The two reference files agree ────────────────────────────────────────
for (const nutrient of database.nutrients) {
  const meta = rosterById.get(nutrient.id);
  if (!meta) {
    fail(`nutrients.json[${nutrient.id}] has no entry in roster.json`);
    continue;
  }

  const compare = [
    ["unit", nutrient.unit, meta.unit],
    ["category", nutrient.category, meta.category],
    ["storage", nutrient.storage, meta.storage],
    ["antioxidantRole", nutrient.antioxidantRole, meta.antioxidantRole],
    ["fdcNutrientId", nutrient.fdcNutrientId, meta.fdcNutrientId],
  ];
  for (const [field, entryValue, rosterValue] of compare) {
    if (entryValue !== rosterValue) {
      fail(
        `${nutrient.id}: nutrients.json ${field}=${JSON.stringify(entryValue)} but ` +
          `roster.json ${field}=${JSON.stringify(rosterValue)}`,
      );
    }
  }

  const expectedTier = nutrient.hasReferenceIntake
    ? nutrient.category === "macronutrient"
      ? 1
      : 2
    : 3;
  if (meta.tier !== expectedTier) {
    fail(`${nutrient.id}: roster tier ${meta.tier} disagrees with its entry shape`);
  }

  for (const interaction of nutrient.interactions ?? []) {
    if (!rosterById.has(interaction.with)) {
      fail(`${nutrient.id}: interaction target "${interaction.with}" is not a tracked nutrient`);
    }
  }
}

// ── 5. Demo fixtures resolve ────────────────────────────────────────────────
const foodIds = new Set();
for (const food of foods.foods) {
  foodIds.add(food.id);
  const blocks = [
    ["nutrients", food.nutrients],
    ["phytonutrients", food.phytonutrients],
  ];
  for (const [block, values] of blocks) {
    if (!values) continue;
    for (const id of Object.keys(values)) {
      if (!rosterById.has(id)) {
        fail(`demo/foods.json[${food.id}].${block} has unknown nutrient id "${id}"`);
      }
    }
  }
  if (food.phytonutrients) {
    for (const id of Object.keys(food.phytonutrients)) {
      if (rosterById.get(id)?.tier !== 3) {
        fail(`demo/foods.json[${food.id}].phytonutrients contains "${id}", which is not Tier 3`);
      }
    }
  }
}

for (const entry of day.entries) {
  if (!foodIds.has(entry.foodId)) {
    fail(`demo/day.json[${entry.id}] references unknown food "${entry.foodId}"`);
  }
}

for (const item of draft.draft.items) {
  if (!foodIds.has(item.resolvedFoodId)) {
    fail(`demo/photo-draft.json[${item.id}] resolves to unknown food "${item.resolvedFoodId}"`);
  }
}

const historyMeta = new Set(["date", "plantSpecies", "coverage", "entryCount"]);
for (const dayRow of history.days) {
  for (const key of Object.keys(dayRow)) {
    if (historyMeta.has(key)) continue;
    if (!rosterById.has(key)) {
      fail(`demo/history.json[${dayRow.date}] has unknown nutrient id "${key}"`);
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
const written = database.nutrients.length;
const total = roster.roster.length;

if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):\n`);
  for (const error of errors) console.error(`  ✗ ${error}`);
  console.error("");
  process.exit(1);
}

console.log(
  `✓ data layer valid — ${written} of ${total} reference entries written, ` +
    `${foods.foods.length} demo foods, ${history.days.length} days of history`,
);
