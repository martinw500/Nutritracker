import { defineConfig } from "drizzle-kit";

// Next loads .env.local automatically at runtime. Drizzle Kit runs outside
// Next, so load the same file before reading DATABASE_URL.
try {
  process.loadEnvFile(".env.local");
} catch {
  try {
    process.loadEnvFile(".env");
  } catch {
    // The schema can still be generated without a live database connection.
  }
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://missing:missing@localhost:5432/missing",
  },
  strict: true,
  verbose: true,
});
