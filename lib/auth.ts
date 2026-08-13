import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { getDb, hasDatabaseConfiguration } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export function hasAuthConfiguration(): boolean {
  return hasDatabaseConfiguration() && Boolean(authSecret());
}

function createAuth() {
  const secret = authSecret();
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not configured. See .env.example.");
  }

  return betterAuth({
    appName: "NutriTracker",
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    secret,
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let instance: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (instance) return instance;
  instance = createAuth();
  return instance;
}

function authSecret(): string | undefined {
  return process.env.BETTER_AUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
}
