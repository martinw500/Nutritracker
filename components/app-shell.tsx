"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Aperture,
  CalendarDays,
  FlaskConical,
  Settings,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { DetailLevelToggle } from "@/components/detail-level";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Today", icon: CalendarDays },
  { href: "/log", label: "Log", icon: UtensilsCrossed },
  { href: "/nutrients", label: "Nutrients", icon: FlaskConical },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-dvh">
      <DemoBanner />

      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 pb-24 sm:px-6 md:pb-10">
        <aside className="sticky top-8 hidden h-fit w-44 shrink-0 py-8 md:block">
          <Link href="/" className="mb-8 block">
            <span className="text-sm font-semibold tracking-tight text-ink">
              NutriTracker
            </span>
            <span className="mt-0.5 block text-[11px] text-faint">
              micronutrients first
            </span>
          </Link>

          <nav className="space-y-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-sunken font-medium text-ink"
                    : "text-muted hover:bg-sunken hover:text-ink",
                )}
              >
                <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/log/photo"
            className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Aperture className="size-4" strokeWidth={2} />
            Log a photo
          </Link>
        </aside>

        <main className="min-w-0 flex-1 py-6 md:py-8">
          <div className="mb-6 flex items-center justify-between gap-4 md:justify-end">
            <span className="text-sm font-semibold tracking-tight text-ink md:hidden">
              NutriTracker
            </span>
            <DetailLevelToggle />
          </div>
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px]",
                isActive(item.href) ? "text-accent" : "text-faint",
              )}
            >
              <item.icon className="size-5" strokeWidth={1.75} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

/**
 * Every number on screen comes from `data/demo/`. Saying so at the top of every
 * page is not decoration — an unlabelled demo is how a fixture ends up being
 * quoted as a real figure.
 */
function DemoBanner() {
  return (
    <div className="border-b border-border bg-sunken">
      <p className="mx-auto max-w-6xl px-4 py-2 text-[11px] leading-relaxed text-muted sm:px-6">
        <span className="font-medium text-ink">Demo data.</span> There is no database
        and no AI wired up yet. Every food, every log entry and the whole 30-day
        history come from <code className="text-faint">data/demo/</code>. Reference
        intakes, evidence tiers and nutrient copy are real, from{" "}
        <code className="text-faint">data/nutrients.json</code>.
      </p>
    </div>
  );
}
