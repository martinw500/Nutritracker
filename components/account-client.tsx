"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardHeader, Note } from "@/components/ui";

type AuthMode = "sign-in" | "sign-up";

interface Profile {
  sex: "male" | "female";
  birthDate: string;
  weightKg: number;
  heightCm: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  pregnancyStatus: "none" | "pregnant" | "lactating";
  detailLevel: "simple" | "expert";
}

const EMPTY_PROFILE: Profile = {
  sex: "female",
  birthDate: "1990-01-01",
  weightKg: 70,
  heightCm: 170,
  activityLevel: "moderate",
  pregnancyStatus: "none",
  detailLevel: "simple",
};

export function AccountClient({ configured }: { configured: boolean }) {
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        subtitle="Your account keeps your profile and, next, your food log available across devices."
      />

      {!configured ? (
        <Note tone="warn">
          Account storage is installed but not connected. Add DATABASE_URL and
          BETTER_AUTH_SECRET locally and in Vercel, then run npm run db:migrate.
          The fixture-based demo remains available meanwhile.
        </Note>
      ) : null}

      {configured && isPending ? <Note>Checking your session…</Note> : null}

      {configured && !isPending && !session ? (
        <Card>
          <CardHeader
            title={mode === "sign-in" ? "Sign in" : "Create account"}
            aside={<Badge tone="accent">Postgres</Badge>}
          />
          <AuthForm
            mode={mode}
            error={error}
            onSubmit={async (values) => {
              setError(null);
              const result =
                mode === "sign-up"
                  ? await authClient.signUp.email(values)
                  : await authClient.signIn.email({
                      email: values.email,
                      password: values.password,
                    });
              if (result.error) {
                setError(result.error.message ?? "Authentication failed.");
                return;
              }
              router.refresh();
            }}
          />
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
            }}
            className="mt-4 text-xs font-medium text-accent hover:underline"
          >
            {mode === "sign-in" ? "Need an account? Create one" : "Already registered? Sign in"}
          </button>
        </Card>
      ) : null}

      {configured && session ? (
        <>
          <Card>
            <CardHeader
              title={session.user.name}
              subtitle={session.user.email}
              aside={<Badge tone="met">signed in</Badge>}
            />
            <button
              type="button"
              onClick={async () => {
                await authClient.signOut();
                router.refresh();
              }}
              className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-sunken"
            >
              Sign out
            </button>
          </Card>
          <ProfileEditor />
        </>
      ) : null}
    </div>
  );
}

function AuthForm({
  mode,
  error,
  onSubmit,
}: {
  mode: AuthMode;
  error: string | null;
  onSubmit: (values: { name: string; email: string; password: string }) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await onSubmit({
        name: String(form.get("name") || "NutriTracker user"),
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "sign-up" ? <TextField name="name" label="Name" autoComplete="name" /> : null}
      <TextField name="email" label="Email" type="email" autoComplete="email" />
      <TextField
        name="password"
        label="Password"
        type="password"
        minLength={10}
        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
      />
      {error ? <Note tone="warn">{error}</Note> : null}
      <button
        disabled={busy}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60"
      >
        {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}

function ProfileEditor() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetch("/api/profile")
      .then(async (response) => {
        const data = (await response.json()) as { profile?: Profile | null; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load profile.");
        if (live && data.profile) setProfile(data.profile);
      })
      .catch((reason: unknown) => {
        if (live) setMessage(reason instanceof Error ? reason.message : "Could not load profile.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving…");
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = (await response.json()) as { profile?: Profile; error?: string };
    if (!response.ok || !data.profile) {
      setMessage(data.error ?? "Could not save profile.");
      return;
    }
    setProfile(data.profile);
    setMessage("Saved to Postgres.");
  }

  return (
    <Card>
      <CardHeader
        title="Health profile"
        subtitle="These fields select personalized reference intakes. They are private account data, not public profile fields."
      />
      {loading ? (
        <Note>Loading profile…</Note>
      ) : (
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Sex used by DRI tables"
            value={profile.sex}
            onChange={(sex) =>
              setProfile((current) => ({
                ...current,
                sex: sex as Profile["sex"],
                pregnancyStatus: sex === "male" ? "none" : current.pregnancyStatus,
              }))
            }
            options={[
              ["female", "Female"],
              ["male", "Male"],
            ]}
          />
          <TextField
            name="birthDate"
            label="Birth date"
            type="date"
            value={profile.birthDate}
            onChange={(value) => setProfile((current) => ({ ...current, birthDate: value }))}
          />
          <TextField
            name="weightKg"
            label="Weight (kg)"
            type="number"
            min={20}
            max={500}
            step="0.1"
            value={String(profile.weightKg)}
            onChange={(value) => setProfile((current) => ({ ...current, weightKg: Number(value) }))}
          />
          <TextField
            name="heightCm"
            label="Height (cm)"
            type="number"
            min={80}
            max={260}
            step="0.1"
            value={String(profile.heightCm)}
            onChange={(value) => setProfile((current) => ({ ...current, heightCm: Number(value) }))}
          />
          <SelectField
            label="Activity"
            value={profile.activityLevel}
            onChange={(activityLevel) =>
              setProfile((current) => ({
                ...current,
                activityLevel: activityLevel as Profile["activityLevel"],
              }))
            }
            options={[
              ["sedentary", "Sedentary"],
              ["light", "Light"],
              ["moderate", "Moderate"],
              ["active", "Active"],
              ["very_active", "Very active"],
            ]}
          />
          <SelectField
            label="Detail level"
            value={profile.detailLevel}
            onChange={(detailLevel) =>
              setProfile((current) => ({
                ...current,
                detailLevel: detailLevel as Profile["detailLevel"],
              }))
            }
            options={[
              ["simple", "Simple"],
              ["expert", "Expert"],
            ]}
          />
          {profile.sex === "female" ? (
            <SelectField
              label="Pregnancy"
              value={profile.pregnancyStatus}
              onChange={(pregnancyStatus) =>
                setProfile((current) => ({
                  ...current,
                  pregnancyStatus: pregnancyStatus as Profile["pregnancyStatus"],
                }))
              }
              options={[
                ["none", "Neither"],
                ["pregnant", "Pregnant"],
                ["lactating", "Lactating"],
              ]}
            />
          ) : null}
          <div className="sm:col-span-2 flex items-center gap-3">
            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent">
              Save profile
            </button>
            {message ? <span className="text-xs text-muted">{message}</span> : null}
          </div>
        </form>
      )}
    </Card>
  );
}

function TextField({
  label,
  name,
  type = "text",
  value,
  onChange,
  ...inputProps
}: {
  label: string;
  name: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label className="block text-xs text-muted">
      <span className="mb-1.5 block">{label}</span>
      <input
        required
        name={name}
        type={type}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="w-full rounded-lg border border-border bg-sunken px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        {...inputProps}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block text-xs text-muted">
      <span className="mb-1.5 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-sunken px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      >
        {options.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
