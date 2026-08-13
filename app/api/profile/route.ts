import { eq } from "drizzle-orm";
import { getAuth, hasAuthConfiguration } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";

const SEX = new Set(["male", "female"] as const);
const PREGNANCY = new Set(["none", "pregnant", "lactating"] as const);
const DETAIL = new Set(["simple", "expert"] as const);
const ACTIVITY = new Set([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const);

export async function GET(request: Request) {
  const session = await authenticatedSession(request);
  if (session instanceof Response) return session;

  const [profile] = await getDb()
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id))
    .limit(1);

  return Response.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    profile: profile ? serializeProfile(profile) : null,
  });
}

export async function PUT(request: Request) {
  const session = await authenticatedSession(request);
  if (session instanceof Response) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseProfile(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const now = new Date();
  const [profile] = await getDb()
    .insert(userProfiles)
    .values({
      userId: session.user.id,
      ...parsed.value,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...parsed.value, updatedAt: now },
    })
    .returning();

  return Response.json({ profile: serializeProfile(profile) });
}

async function authenticatedSession(request: Request) {
  if (!hasAuthConfiguration()) {
    return Response.json({ error: "Database authentication is not configured." }, { status: 503 });
  }

  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Sign in to manage your profile." }, { status: 401 });
  }
  return session;
}

function parseProfile(body: unknown):
  | { error: string }
  | {
      value: {
        sex: "male" | "female";
        birthDate: string;
        weightKg: string;
        heightCm: string;
        activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
        pregnancyStatus: "none" | "pregnant" | "lactating";
        detailLevel: "simple" | "expert";
      };
    } {
  if (!body || typeof body !== "object") return { error: "Profile is required." };
  const value = body as Record<string, unknown>;

  if (typeof value.sex !== "string" || !SEX.has(value.sex as never)) {
    return { error: "Select male or female for DRI reference calculations." };
  }
  if (
    typeof value.birthDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.birthDate) ||
    Number.isNaN(Date.parse(`${value.birthDate}T00:00:00Z`))
  ) {
    return { error: "Enter a valid birth date." };
  }

  const weightKg = finiteInRange(value.weightKg, 20, 500);
  const heightCm = finiteInRange(value.heightCm, 80, 260);
  if (weightKg === null) return { error: "Weight must be between 20 and 500 kg." };
  if (heightCm === null) return { error: "Height must be between 80 and 260 cm." };

  if (typeof value.activityLevel !== "string" || !ACTIVITY.has(value.activityLevel as never)) {
    return { error: "Select a valid activity level." };
  }
  if (
    typeof value.pregnancyStatus !== "string" ||
    !PREGNANCY.has(value.pregnancyStatus as never)
  ) {
    return { error: "Select a valid pregnancy status." };
  }
  if (value.sex === "male" && value.pregnancyStatus !== "none") {
    return { error: "Pregnancy status must be none for a male DRI profile." };
  }
  if (typeof value.detailLevel !== "string" || !DETAIL.has(value.detailLevel as never)) {
    return { error: "Select a valid detail level." };
  }

  return {
    value: {
      sex: value.sex as "male" | "female",
      birthDate: value.birthDate,
      weightKg: weightKg.toFixed(2),
      heightCm: heightCm.toFixed(2),
      activityLevel: value.activityLevel as
        | "sedentary"
        | "light"
        | "moderate"
        | "active"
        | "very_active",
      pregnancyStatus: value.pregnancyStatus as "none" | "pregnant" | "lactating",
      detailLevel: value.detailLevel as "simple" | "expert",
    },
  };
}

function finiteInRange(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function serializeProfile(profile: typeof userProfiles.$inferSelect) {
  return {
    sex: profile.sex,
    birthDate: profile.birthDate,
    weightKg: profile.weightKg === null ? null : Number(profile.weightKg),
    heightCm: profile.heightCm === null ? null : Number(profile.heightCm),
    activityLevel: profile.activityLevel,
    pregnancyStatus: profile.pregnancyStatus,
    detailLevel: profile.detailLevel,
    activeGoalModes: profile.activeGoalModes,
  };
}
