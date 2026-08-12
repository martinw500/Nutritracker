"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Plus,
  Settings,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { DetailLevelToggle } from "@/components/detail-level";
import { getDayDate } from "@/lib/demo";
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
      <TopBar />

      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 pb-24 sm:px-6 md:pb-12">
        <aside className="sticky top-20 hidden h-fit w-44 shrink-0 py-6 md:block">
          <nav className="space-y-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-accent-soft font-medium text-accent"
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
            className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Log food
          </Link>

          <DemoNote />
        </aside>

        <main className="min-w-0 flex-1 py-5 md:py-6">{children}</main>
      </div>

      {/* Mobile: bottom nav with the add action raised out of it, the pattern
          every tracker converges on because the thumb is already there. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
          {NAV.slice(0, 2).map((item) => (
            <NavTab key={item.href} item={item} active={isActive(item.href)} />
          ))}

          <div className="flex justify-center">
            <Link
              href="/log/photo"
              aria-label="Log food"
              className="-mt-5 flex size-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition-colors hover:bg-accent-hover"
            >
              <Plus className="size-6" strokeWidth={2.5} />
            </Link>
          </div>

          {NAV.slice(2, 4).map((item) => (
            <NavTab key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavTab({
  item,
  active,
}: {
  item: (typeof NAV)[number];
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 text-[10px]",
        active ? "text-accent" : "text-faint",
      )}
    >
      <item.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
      {item.label}
    </Link>
  );
}

/**
 * Date navigation is the thing a tracker cannot do without — the second
 * question anyone asks it is "what did I eat yesterday". The arrows are
 * disabled rather than hidden: the affordance is the point, and hiding it
 * would suggest the app is a single-day tool.
 */
function TopBar() {
  const date = new Date(`${getDayDate()}T12:00:00`);
  const label = date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0">
          <span className="text-sm font-semibold tracking-tight text-ink">
            NutriTracker
          </span>
        </Link>

        <div className="mx-auto flex items-center gap-1">
          <button
            disabled
            aria-label="Previous day"
            title="Moving between days needs the real log — see docs/STATUS.md"
            className="flex size-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-sunken disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[7.5rem] text-center text-sm font-medium text-ink">
            {label}
          </span>
          <button
            disabled
            aria-label="Next day"
            title="Moving between days needs the real log — see docs/STATUS.md"
            className="flex size-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-sunken disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="shrink-0">
          <DetailLevelToggle />
        </div>
      </div>
    </header>
  );
}

/**
 * Every number on screen comes from `data/demo/`. Saying so is not decoration —
 * an unlabelled demo is how a fixture ends up quoted as a real figure. Moved
 * out of the way of the content, but never removed.
 */
function DemoNote() {
  return (
    <p className="mt-6 rounded-lg bg-sunken p-3 text-[11px] leading-relaxed text-muted">
      <span className="font-medium text-ink">Demo data.</span> No database, no AI. Foods
      and log entries come from <code className="text-faint">data/demo/</code>. Reference
      intakes, evidence tiers and flags are real and cited.
    </p>
  );
}
