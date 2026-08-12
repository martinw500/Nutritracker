"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, KeyRound, Server, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, CardHeader, Note } from "@/components/ui";
import { cn } from "@/lib/utils";

type Method = "openrouter" | "key" | "local";

export default function AiSettingsPage() {
  const [method, setMethod] = useState<Method>("openrouter");

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Settings
      </Link>

      <PageHeader
        title="Connect AI access"
        subtitle="Photo logging runs on your own AI account. There is no subscription and no shared key, which is why there is nothing to pay us and no per-user cost to run this."
      />

      <Card className="!bg-sunken">
        <p className="text-sm leading-relaxed text-ink">
          A photo log costs about <span className="numeric">$0.002</span> on the default
          model — roughly 70&nbsp;cents for a year of logging three meals a day.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          The vision call identifies foods and estimates portions. It is never asked for
          a nutrient value, so the model can be cheap, or small, or running on your own
          machine, without putting a wrong number into your data.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <MethodCard
          id="openrouter"
          active={method === "openrouter"}
          onSelect={setMethod}
          icon={<Zap className="size-4" strokeWidth={2} />}
          title="OpenRouter"
          badge="Recommended"
          body="One click. Covers Claude, GPT, Gemini, Llama and hundreds more through a single connection."
        />
        <MethodCard
          id="key"
          active={method === "key"}
          onSelect={setMethod}
          icon={<KeyRound className="size-4" strokeWidth={2} />}
          title="Paste a key"
          body="Anthropic, OpenAI or Google, direct. Neither offers third-party sign-in, so this one is a paste."
        />
        <MethodCard
          id="local"
          active={method === "local"}
          onSelect={setMethod}
          icon={<Server className="size-4" strokeWidth={2} />}
          title="Local model"
          body="Ollama or LM Studio. Nothing leaves your machine."
        />
      </div>

      {method === "openrouter" ? (
        <Card>
          <CardHeader
            title="Connect with OpenRouter"
            subtitle="An OAuth flow with PKCE — you authorise on OpenRouter, we exchange the code for a key. We never see your password."
          />
          <button
            disabled
            title="Not wired up yet — Phase 2."
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent opacity-60"
          >
            <Zap className="size-4" strokeWidth={2.5} />
            Authorise with OpenRouter
          </button>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            You will need an OpenRouter account with credit on it. That is a real
            barrier and we would rather say so here than hide it — manual logging stays
            fully functional if you would rather not.
          </p>
        </Card>
      ) : null}

      {method === "key" ? (
        <Card>
          <CardHeader
            title="Paste an API key"
            subtitle="Stored encrypted with AES-256-GCM, never returned to the browser, and used only server-side."
          />
          <input
            type="password"
            placeholder="sk-…"
            disabled
            className="w-full rounded-lg border border-border bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint disabled:opacity-60"
          />
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Your key sits on our server, encrypted at rest, and every inference call is
            proxied through us. That is a real trust ask, and it is stated here rather
            than buried in a privacy page.
          </p>
        </Card>
      ) : null}

      {method === "local" ? (
        <Card>
          <CardHeader
            title="Point at a local endpoint"
            subtitle="An Ollama or LM Studio base URL on your own network."
          />
          <input
            placeholder="http://localhost:11434"
            disabled
            className="w-full rounded-lg border border-border bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint disabled:opacity-60"
          />
          <div className="mt-4">
            <Note tone="warn">
              Small local models misidentify foods more often than the hosted ones. They
              cannot invent a nutrient value — that is not something a model is ever
              asked for here — but you will be correcting the food names more. Logs from
              a local model are marked low-confidence and quick-accept is turned off.
            </Note>
          </div>
        </Card>
      ) : null}

      <Note>
        Nothing on this page is wired up. The OAuth flow, key encryption and the vision
        call are Phase 2 — see docs/STATUS.md.
      </Note>
    </div>
  );
}

function MethodCard({
  id,
  active,
  onSelect,
  icon,
  title,
  body,
  badge,
}: {
  id: Method;
  active: boolean;
  onSelect: (id: Method) => void;
  icon: React.ReactNode;
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        "rounded-card border p-4 text-left transition-colors",
        active ? "border-accent bg-accent-soft/40" : "border-border hover:bg-sunken",
      )}
    >
      <div className="flex items-center gap-2 text-ink">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      {badge ? (
        <div className="mt-2">
          <Badge tone="accent">{badge}</Badge>
        </div>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-muted">{body}</p>
    </button>
  );
}
