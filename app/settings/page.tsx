"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { DetailLevelToggle, useDetailLevel } from "@/components/detail-level";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardHeader, Note } from "@/components/ui";
import { getActiveGoalModes, getGoalModes, getProfile } from "@/lib/demo";
import { formatAmount } from "@/lib/nutrition/format";
import {
  ageFromBirthDate,
  resolveReference,
  type PregnancyStatus,
  type Sex,
} from "@/lib/nutrition/personalize";
import { getAllTracked } from "@/lib/nutrition/roster";
import { hasTarget } from "@/lib/nutrition/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const profile = getProfile();
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [age, setAge] = useState(ageFromBirthDate(profile.birthDate));
  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus>(
    profile.pregnancyStatus,
  );
  const [goalModeIds, setGoalModeIds] = useState<string[]>(getActiveGoalModes().map((m) => m.id));

  const person = { sex, ageYears: age, pregnancyStatus };
  const { detail } = useDetailLevel();

  const documented = getAllTracked().filter(
    (item) => item.entry !== null && hasTarget(item.entry),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Your age and sex select which column of the DRI tables every target on the dashboard comes from."
      />

      <Card>
        <CardHeader title="Profile" />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Sex">
            <Choice
              options={[
                { id: "male", label: "Male" },
                { id: "female", label: "Female" },
              ]}
              value={sex}
              onChange={(value) => {
                setSex(value as Sex);
                if (value === "male") setPregnancyStatus("none");
              }}
            />
          </Field>

          <Field label={`Age — ${age}`}>
            <input
              type="range"
              min={1}
              max={85}
              value={age}
              onChange={(event) => setAge(Number(event.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </Field>

          {sex === "female" ? (
            <Field label="Pregnancy">
              <Choice
                options={[
                  { id: "none", label: "Neither" },
                  { id: "pregnant", label: "Pregnant" },
                  { id: "lactating", label: "Lactating" },
                ]}
                value={pregnancyStatus}
                onChange={(value) => setPregnancyStatus(value as PregnancyStatus)}
              />
            </Field>
          ) : null}

          <Field label={`Weight — ${profile.weightKg} kg`}>
            <p className="text-xs text-faint">
              Used for protein-per-kg targets. Not editable in the demo.
            </p>
          </Field>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
            Your targets, right now
          </p>
          <ul className="divide-y divide-border">
            {documented.map(({ meta, entry }) => {
              if (!entry || !hasTarget(entry)) return null;
              const rda = resolveReference(entry.reference.rda, person);
              const ai = rda ? null : resolveReference(entry.reference.ai, person);
              const resolved = rda ?? ai;

              return (
                <li key={meta.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="text-sm text-ink">{meta.name}</span>
                  <span className="numeric text-sm text-ink">
                    {resolved ? (
                      <>
                        {formatAmount(resolved.value, meta.unit, detail)}
                        <span className="ml-2 text-faint">{resolved.key}</span>
                      </>
                    ) : (
                      <span className="text-faint">
                        no reference published for this life stage
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-faint">
            Only the {documented.length} nutrients with a written reference panel can show
            a target. Move the age slider across 30 and 50 to watch the bands change.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Detail level"
          subtitle="Expert mode is a strict superset — the same screens, the same order, with more revealed. Nothing moves and nothing is replaced."
          aside={<DetailLevelToggle />}
        />
        <ul className="space-y-1.5 text-xs text-muted">
          <li>EAR, AI and UL beside the RDA, with the full life-stage table</li>
          <li>Evidence tier badges and the reasoning behind each claim</li>
          <li>Exact values instead of rounded ones</li>
          <li>Per-food FoodData Central provenance, and citations</li>
          <li>All {getAllTracked().length} tracked values instead of the headline set</li>
        </ul>
      </Card>

      <Card>
        <CardHeader
          title="Goal modes"
          subtitle="Pick as many as apply. They are mostly independent — wanting more protein says nothing about wanting a lower glycemic load — and they only re-weight what gets emphasised. None of them hides data, so combining them cannot hide anything either."
        />
        <div className="space-y-3">
          {getGoalModes().map((mode) => {
            const active = goalModeIds.includes(mode.id);
            return (
            <button
              key={mode.id}
              role="checkbox"
              aria-checked={active}
              onClick={() =>
                setGoalModeIds((current) =>
                  current.includes(mode.id)
                    ? current.filter((id) => id !== mode.id)
                    : [...current, mode.id],
                )
              }
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                active ? "border-accent bg-accent-soft/40" : "border-border hover:bg-sunken",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink">{mode.name}</span>
                {active ? <Badge tone="accent">on</Badge> : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{mode.description}</p>

              {mode.flags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {mode.flags.map((flag) => (
                    <Badge key={flag} tone="quiet">
                      {flag}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <p className="mt-3 border-t border-border pt-2 text-[11px] leading-relaxed text-faint">
                <span className="font-medium text-muted">Evidence: </span>
                {mode.evidenceNote}
              </p>
            </button>
            );
          })}
        </div>

        {goalModeIds.length === 0 ? (
          <p className="mt-3 text-xs text-faint">
            With none selected the dashboard falls back to general health.
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="AI access" subtitle="Bring your own. Nothing is billed to us, and nothing is billed to you by us." />
        <Link
          href="/settings/ai"
          className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-sunken"
        >
          <div>
            <p className="text-sm text-ink">Not connected</p>
            <p className="text-xs text-muted">
              Photo logging needs an AI provider. Everything else already works.
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-faint" />
        </Link>
      </Card>

      <Note>
        Nothing on this page persists. Detail level is kept in your browser; everything
        else resets on reload, because there is no database yet.
      </Note>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted">{label}</p>
      {children}
    </div>
  );
}

function Choice({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-sunken p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-md px-3 py-1 text-xs transition-colors",
            value === option.id ? "bg-surface text-ink shadow-sm" : "text-faint hover:text-muted",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
