import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { NutrientVector } from "@/lib/nutrition/scale";

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const pregnancyStatusEnum = pgEnum("pregnancy_status", [
  "none",
  "pregnant",
  "lactating",
]);
export const detailLevelEnum = pgEnum("detail_level", ["simple", "expert"]);
export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export const foodSourceEnum = pgEnum("food_source", ["fdc", "off", "custom"]);
export const mealEnum = pgEnum("meal", ["breakfast", "lunch", "snack", "dinner"]);
export const quantityUnitEnum = pgEnum("quantity_unit", [
  "g",
  "ml",
  "piece",
  "cup",
  "tbsp",
]);
export const logSourceEnum = pgEnum("log_source", [
  "photo",
  "search",
  "barcode",
  "manual",
]);
export const credentialSourceEnum = pgEnum("credential_source", ["oauth", "manual"]);
export const streakTypeEnum = pgEnum("streak_type", ["deficiency", "excess"]);

// Better Auth owns these four tables. Keeping the schema here means account
// changes and application changes travel through the same Drizzle migrations.
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  sex: sexEnum("sex"),
  birthDate: date("birth_date"),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
  heightCm: numeric("height_cm", { precision: 6, scale: 2 }),
  activityLevel: activityLevelEnum("activity_level").default("moderate").notNull(),
  pregnancyStatus: pregnancyStatusEnum("pregnancy_status").default("none").notNull(),
  detailLevel: detailLevelEnum("detail_level").default("simple").notNull(),
  activeGoalModes: jsonb("active_goal_modes").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const foods = pgTable(
  "foods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fdcId: integer("fdc_id"),
    name: text("name").notNull(),
    brand: text("brand"),
    source: foodSourceEnum("source").notNull(),
    fdcDataType: text("fdc_data_type"),
    nutrients: jsonb("nutrients").$type<NutrientVector>().notNull(),
    // Null means coverage is unknown, while {} means measured with no values.
    phytonutrients: jsonb("phytonutrients").$type<NutrientVector | null>(),
    gi: numeric("gi", { precision: 5, scale: 2 }),
    glPer100g: numeric("gl_per_100g", { precision: 6, scale: 2 }),
    plantSpecies: text("plant_species"),
    verified: boolean("verified").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("foods_fdc_id_unique").on(table.fdcId).where(sql`${table.fdcId} is not null`),
    index("foods_name_idx").on(table.name),
  ],
);

export const foodAliases = pgTable(
  "food_aliases",
  {
    aliasText: text("alias_text").primaryKey(),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    hitCount: integer("hit_count").default(1).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("food_aliases_food_id_idx").on(table.foodId)],
);

export const logEntries = pgTable(
  "log_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
    meal: mealEnum("meal").notNull(),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    unit: quantityUnitEnum("unit").notNull(),
    resolvedNutrients: jsonb("resolved_nutrients").$type<NutrientVector>().notNull(),
    resolvedPhytonutrients: jsonb("resolved_phytonutrients").$type<NutrientVector | null>(),
    source: logSourceEnum("source").notNull(),
    aiConfidence: numeric("ai_confidence", { precision: 4, scale: 3 }),
    userEdited: boolean("user_edited").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("log_entries_user_logged_at_idx").on(table.userId, table.loggedAt),
    index("log_entries_food_id_idx").on(table.foodId),
  ],
);

export const dailyTotals = pgTable(
  "daily_totals",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    totals: jsonb("totals").$type<NutrientVector>().notNull(),
    pctRda: jsonb("pct_rda").$type<Record<string, number>>().notNull(),
    completeness: numeric("completeness", { precision: 5, scale: 4 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })],
);

export const streaks = pgTable(
  "streaks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    nutrientId: text("nutrient_id").notNull(),
    type: streakTypeEnum("type").notNull(),
    startedOn: date("started_on").notNull(),
    days: integer("days").notNull(),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    dismissedUntil: timestamp("dismissed_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("streaks_user_nutrient_type_unique").on(
      table.userId,
      table.nutrientId,
      table.type,
    ),
  ],
);

export const goalModes = pgTable("goal_modes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  nutrientWeights: jsonb("nutrient_weights").$type<Record<string, number>>().notNull(),
  flaggedAttributes: jsonb("flagged_attributes").$type<string[]>().notNull(),
  evidenceNote: text("evidence_note").notNull(),
});

export const aiCredentials = pgTable(
  "ai_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    // AES-GCM envelope encoded as base64 JSON; never returned to the browser.
    encryptedKey: text("encrypted_key").notNull(),
    keySource: credentialSourceEnum("key_source").notNull(),
    baseUrl: text("base_url"),
    modelId: text("model_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ai_credentials_user_provider_unique").on(table.userId, table.provider),
  ],
);

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Food = typeof foods.$inferSelect;
export type LogEntry = typeof logEntries.$inferSelect;
