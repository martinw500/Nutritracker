"use client";

/**
 * Progressive disclosure, in one place.
 *
 * There is one dashboard, one detail panel, one of everything. Detail level
 * decides how much of each is revealed — it never selects between two versions
 * of the same screen. The moment a `dashboard-expert.tsx` exists, the two
 * diverge and one rots. See CLAUDE.md, "Progressive disclosure".
 *
 * Backed by localStorage until `users.detail_level` exists.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { DetailLevel } from "@/lib/nutrition/format";

const STORAGE_KEY = "nutritracker.detailLevel";

interface DetailLevelContextValue {
  detail: DetailLevel;
  setDetail: (level: DetailLevel) => void;
  isExpert: boolean;
}

const DetailLevelContext = createContext<DetailLevelContextValue | null>(null);

export function DetailLevelProvider({
  children,
  initial = "simple",
}: {
  children: ReactNode;
  initial?: DetailLevel;
}) {
  const [detail, setDetailState] = useState<DetailLevel>(initial);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "simple" || stored === "expert") setDetailState(stored);
  }, []);

  const setDetail = useCallback((level: DetailLevel) => {
    setDetailState(level);
    window.localStorage.setItem(STORAGE_KEY, level);
  }, []);

  return (
    <DetailLevelContext.Provider
      value={{ detail, setDetail, isExpert: detail === "expert" }}
    >
      {children}
    </DetailLevelContext.Provider>
  );
}

export function useDetailLevel(): DetailLevelContextValue {
  const context = useContext(DetailLevelContext);
  if (!context) {
    throw new Error("useDetailLevel must be used inside a DetailLevelProvider");
  }
  return context;
}

/** Renders only in expert mode. Expert is a strict superset of simple. */
export function ExpertOnly({ children }: { children: ReactNode }) {
  return useDetailLevel().isExpert ? <>{children}</> : null;
}

/**
 * Renders only in simple mode.
 *
 * Use this sparingly and only for a plain-language version of something expert
 * mode states more precisely — never to hide a section that expert mode then
 * shows somewhere else. Moving content is what breaks the superset guarantee.
 */
export function SimpleOnly({ children }: { children: ReactNode }) {
  return useDetailLevel().isExpert ? null : <>{children}</>;
}

export function DetailLevelToggle() {
  const { detail, setDetail } = useDetailLevel();
  const levels: DetailLevel[] = ["simple", "expert"];

  return (
    <div
      role="radiogroup"
      aria-label="Detail level"
      className="inline-flex rounded-full border border-border bg-sunken p-0.5"
    >
      {levels.map((level) => (
        <button
          key={level}
          role="radio"
          aria-checked={detail === level}
          onClick={() => setDetail(level)}
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
            detail === level
              ? "bg-surface text-ink shadow-sm"
              : "text-faint hover:text-muted"
          }`}
        >
          {level}
        </button>
      ))}
    </div>
  );
}
