"use client";

/**
 * The reference panel. ONE component for both audiences.
 *
 * The sections appear in the same order at both detail levels. Expert mode adds
 * to each — the technical summary next to the plain-language one, the EAR/AI/UL
 * beside the RDA, the evidence badge and its reasoning beside the claim. It
 * never reorders and never contradicts, because the content differences live in
 * `data/nutrients.json` (oneLiner vs summary) rather than in branching here.
 */

import Link from "next/link";
import { BenefitList } from "@/components/evidence-badge";
import { ExpertOnly, useDetailLevel } from "@/components/detail-level";
import { StorageNote } from "@/components/storage-note";
import { TargetBar } from "@/components/target-bar";
import {
  Badge,
  BulletList,
  Card,
  CardHeader,
  DefinitionList,
  Note,
  SectionLabel,
} from "@/components/ui";
import { formatAmount } from "@/lib/nutrition/format";
import { resolveReference, type Person } from "@/lib/nutrition/personalize";
import type { TrackedNutrient } from "@/lib/nutrition/roster";
import { hasTarget, isFullEntry, type Nutrient, type ReferenceTable } from "@/lib/nutrition/types";

export function NutrientDetail({
  tracked,
  amount,
  person,
}: {
  tracked: TrackedNutrient;
  amount: number | undefined;
  person: Person;
}) {
  const { meta, entry } = tracked;
  const { detail, isExpert } = useDetailLevel();

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{meta.name}</h1>
          {meta.symbol ? (
            <span className="numeric text-sm text-faint">{meta.symbol}</span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="neutral">{meta.category}</Badge>
          {meta.subcategory ? <Badge tone="quiet">{meta.subcategory}</Badge> : null}
          <Badge tone="quiet">measured in {meta.unit}</Badge>
          {meta.antioxidantRole ? <Badge tone="accent">antioxidant role</Badge> : null}
          {meta.tier === 3 ? <Badge tone="neutral">no reference intake</Badge> : null}
        </div>
      </header>

      {entry === null ? (
        <Card>
          <CardHeader title="Reference panel not written yet" />
          <p className="text-sm leading-relaxed text-muted">
            {meta.name} is tracked and totalled like every other value, but nobody has
            written its reference panel — what it does, what deficiency and excess look
            like, its absorption and interactions, and its cited reference intakes. Until
            that exists there is no target to compare your intake against, and this app
            will not invent one.
          </p>
          {amount !== undefined ? (
            <p className="numeric mt-4 text-sm text-ink">
              Logged today: {formatAmount(amount, meta.unit, detail)}
            </p>
          ) : null}
          <p className="mt-4 text-xs text-faint">
            Reference entries live in <code>data/nutrients.json</code>. Adding one here
            lights this page up with no code change.
          </p>
        </Card>
      ) : (
        <>
          <TodayCard tracked={{ meta, entry }} amount={amount} person={person} />

          <Card>
            <CardHeader title="What it is" />
            <p className="text-sm leading-relaxed text-ink">
              {isFullEntry(entry) ? entry.simpleExplanation : entry.oneLiner}
            </p>

            {isFullEntry(entry) ? (
              <ExpertOnly>
                <div className="mt-5 border-t border-border pt-4">
                  <SectionLabel>Technical summary</SectionLabel>
                  <p className="text-sm leading-relaxed text-muted">{entry.summary}</p>

                  <div className="mt-4">
                    <SectionLabel>What it does</SectionLabel>
                    <BulletList items={entry.whatItDoes} />
                  </div>
                </div>
              </ExpertOnly>
            ) : null}
          </Card>

          <ReferenceCard entry={entry} unit={meta.unit} person={person} />

          {!isFullEntry(entry) ? <BriefNotice name={meta.name} /> : null}
        </>
      )}

      {entry !== null && isFullEntry(entry) ? (
        <>
          <Card>
            <CardHeader
              title="What the evidence says"
              subtitle={
                isExpert
                  ? "Each claim carries an evidence tier and the reasoning behind it, negative findings included."
                  : "Wording reflects how strong the evidence actually is."
              }
            />
            <BenefitList benefits={entry.benefits} />
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader
                title="Deficiency"
                subtitle={entry.deficiency.clinicalName ?? undefined}
              />
              <p className="text-xs leading-relaxed text-muted">
                {entry.deficiency.prevalence}
              </p>

              {entry.deficiency.earlySigns.length > 0 ? (
                <div className="mt-4">
                  <SectionLabel>Early signs</SectionLabel>
                  <BulletList items={entry.deficiency.earlySigns} />
                </div>
              ) : null}

              <ExpertOnly>
                {entry.deficiency.advancedSigns.length > 0 ? (
                  <div className="mt-4">
                    <SectionLabel>Advanced signs</SectionLabel>
                    <BulletList items={entry.deficiency.advancedSigns} />
                  </div>
                ) : null}
              </ExpertOnly>

              {entry.deficiency.riskGroups.length > 0 ? (
                <div className="mt-4">
                  <SectionLabel>Higher risk</SectionLabel>
                  <BulletList items={entry.deficiency.riskGroups} />
                </div>
              ) : null}
            </Card>

            <Card>
              <CardHeader
                title="Excess"
                subtitle={entry.excess.clinicalName ?? undefined}
              />
              <p className="text-xs leading-relaxed text-muted">{entry.excess.fromFood}</p>

              {entry.excess.fromSupplements.length > 0 ? (
                <div className="mt-4">
                  <SectionLabel>From supplements</SectionLabel>
                  <BulletList items={entry.excess.fromSupplements} />
                </div>
              ) : null}

              {entry.excess.severeRisk ? (
                <div className="mt-4">
                  <SectionLabel>At extreme doses</SectionLabel>
                  <p className="text-xs leading-relaxed text-muted">
                    {entry.excess.severeRisk}
                  </p>
                </div>
              ) : null}
            </Card>
          </div>

          <Card>
            <CardHeader title="Absorption" subtitle={entry.absorption.typicalRate} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <SectionLabel>Helps absorption</SectionLabel>
                <BulletList items={entry.absorption.enhancers} />
              </div>
              <div>
                <SectionLabel>Hinders absorption</SectionLabel>
                <BulletList items={entry.absorption.inhibitors} />
              </div>
            </div>
            <ExpertOnly>
              <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted">
                {entry.absorption.notes}
              </p>
            </ExpertOnly>
          </Card>

          <ExpertOnly>
            {entry.interactions.length > 0 ? (
              <Card>
                <CardHeader title="Interactions" />
                <ul className="space-y-3">
                  {entry.interactions.map((interaction) => (
                    <li key={interaction.with} className="border-l-2 border-border pl-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/nutrients/${interaction.with}`}
                          className="text-sm text-ink underline-offset-2 hover:underline"
                        >
                          {interaction.with}
                        </Link>
                        <Badge tone="quiet">{interaction.direction}</Badge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {interaction.effect}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </ExpertOnly>

          <Card>
            <CardHeader
              title="Top sources"
              subtitle={`Per 100 g, in ${meta.unit}. FoodData Central IDs are resolved by the importer, not written by hand.`}
            />
            <ul className="divide-y divide-border">
              {entry.topSources.map((source) => (
                <li
                  key={source.name}
                  className="flex items-baseline justify-between gap-4 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{source.name}</p>
                    <p className="text-[11px] text-faint">{source.typicalServing}</p>
                  </div>
                  <span className="numeric shrink-0 text-sm text-ink">
                    {formatAmount(source.per100g, meta.unit, detail)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-faint">
              Ranking these by what you already eat needs the real log — see
              docs/STATUS.md.
            </p>
          </Card>
        </>
      ) : null}

      {/* Citations render at BOTH depths. A brief entry is defined by having a
          cited target — hiding the citation would remove the only thing that
          makes it trustworthy. */}
      {entry !== null ? (
        <Card>
          <CardHeader title="Sources" subtitle={`Last reviewed ${entry.lastReviewed}`} />
          <ul className="space-y-2">
            {entry.citations.map((citation) => (
              <li key={citation.url}>
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent underline-offset-2 hover:underline"
                >
                  {citation.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * Shown in place of the prose sections on a brief entry.
 *
 * The distinction it draws matters: the target above is real and cited, and
 * only the write-up is missing. Rendering empty headings instead would suggest
 * the data itself was thin.
 */
function BriefNotice({ name }: { name: string }) {
  return (
    <Card>
      <CardHeader title="Full write-up not finished" />
      <p className="text-sm leading-relaxed text-muted">
        The reference intake above is real and cited — {name} is assessed against it
        exactly like any other nutrient. What is missing is the written panel: what it
        does in detail, what deficiency and excess look like, absorption, interactions,
        and food sources ranked against what you eat.
      </p>
      <p className="mt-3 text-xs text-faint">
        Entries live in <code>data/nutrients.json</code>. Filling this one in changes no
        code.
      </p>
    </Card>
  );
}

function TodayCard({
  tracked,
  amount,
  person,
}: {
  tracked: { meta: TrackedNutrient["meta"]; entry: Nutrient };
  amount: number | undefined;
  person: Person;
}) {
  const { meta, entry } = tracked;
  const { detail } = useDetailLevel();

  return (
    <Card>
      <CardHeader
        title="Today"
        aside={<StorageNote storage={meta.storage} />}
      />

      {amount === undefined ? (
        <Note>
          None of today&apos;s foods carried a value for {meta.name}. That is a gap in the
          data, not a reading of zero.
        </Note>
      ) : hasTarget(entry) ? (
        <TargetBar nutrient={entry} unit={meta.unit} amount={amount} person={person} />
      ) : (
        <div>
          <p className="numeric text-lg text-ink">
            {formatAmount(amount, meta.unit, detail)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Shown as an absolute amount. There is no percentage here because there is no
            target — see the intake context below.
          </p>
        </div>
      )}
    </Card>
  );
}

function ReferenceCard({
  entry,
  unit,
  person,
}: {
  entry: Nutrient;
  unit: string;
  person: Person;
}) {
  const { detail, isExpert } = useDetailLevel();

  // Tier 3. Structurally cannot have a reference intake — the schema rejects it
  // — so it gets descriptive context instead, framed as context.
  if (!hasTarget(entry)) {
    const context = entry.intakeContext;
    return (
      <Card>
        <CardHeader title="Intake context" subtitle="Not a target." />
        <DefinitionList
          items={[
            {
              term: "Typical intake",
              value: (
                <span className="numeric">
                  {context.populationMedian.value} {context.populationMedian.unit}
                  <span className="ml-2 text-faint">{context.populationMedian.source}</span>
                </span>
              ),
            },
            ...(context.studiedRange
              ? [
                  {
                    term: "Studied range",
                    value: (
                      <span className="numeric">
                        {context.studiedRange.low}–{context.studiedRange.high}{" "}
                        {context.studiedRange.unit}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
        {isExpert && context.studiedRange ? (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {context.studiedRange.note}
          </p>
        ) : null}
        <div className="mt-4">
          <Note>{context.framing}</Note>
        </div>
      </Card>
    );
  }

  const reference = entry.reference;
  const rda = resolveReference(reference.rda, person);
  const ai = resolveReference(reference.ai, person);
  const ear = resolveReference(reference.ear, person);

  const lifeStageKeys = [
    ...new Set([
      ...Object.keys(reference.ear ?? {}),
      ...Object.keys(reference.rda ?? {}),
      ...Object.keys(reference.ai ?? {}),
    ]),
  ].sort();

  const cell = (table: ReferenceTable | null, key: string) =>
    table?.[key] === undefined ? "—" : formatAmount(table[key]!, unit, "expert");

  return (
    <Card>
      <CardHeader
        title="Reference intake"
        subtitle={
          isExpert
            ? "EAR, RDA, AI and UL across every life-stage group published for this nutrient. Your group is highlighted."
            : "Your daily target, personalised to your age and sex."
        }
      />

      <DefinitionList
        items={[
          {
            term: rda ? "RDA" : "AI",
            value: (
              <span className="numeric">
                {rda
                  ? formatAmount(rda.value, unit, detail)
                  : ai
                    ? formatAmount(ai.value, unit, detail)
                    : "—"}
                <span className="ml-2 text-faint">{(rda ?? ai)?.key}</span>
              </span>
            ),
          },
          ...(isExpert && ear
            ? [
                {
                  term: "EAR",
                  value: (
                    <span className="numeric">{formatAmount(ear.value, unit, "expert")}</span>
                  ),
                },
              ]
            : []),
          {
            term: "Upper limit",
            value: reference.ul ? (
              <span className="numeric">
                {formatAmount(reference.ul.value, unit, detail)}
                <span className="ml-2 text-faint">applies to {reference.ul.appliesTo}</span>
              </span>
            ) : (
              <span className="text-muted">none established</span>
            ),
          },
        ]}
      />

      {reference.ul?.note ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">{reference.ul.note}</p>
      ) : null}

      {isExpert ? (
        <div className="mt-5 overflow-x-auto border-t border-border pt-4">
          <table className="w-full min-w-[26rem] text-xs">
            <thead>
              <tr className="text-left text-faint">
                <th className="pb-2 font-medium">Life stage</th>
                <th className="pb-2 text-right font-medium">EAR</th>
                <th className="pb-2 text-right font-medium">RDA</th>
                <th className="pb-2 text-right font-medium">AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lifeStageKeys.map((key) => {
                const mine = key === (rda ?? ai ?? ear)?.key;
                return (
                  <tr key={key} className={mine ? "bg-accent-soft/40" : undefined}>
                    <td className="numeric py-1.5 text-muted">{key}</td>
                    <td className="numeric py-1.5 text-right text-ink">
                      {cell(reference.ear, key)}
                    </td>
                    <td className="numeric py-1.5 text-right text-ink">
                      {cell(reference.rda, key)}
                    </td>
                    <td className="numeric py-1.5 text-right text-ink">
                      {cell(reference.ai, key)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
}
