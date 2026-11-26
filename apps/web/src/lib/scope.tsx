"use client";

// All India ↔ District, shared by the feed and the clubs list (same as the app's scope).
// Kept in this browser; a logged-in person's choice also becomes their home district.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { patch } from "./api";
import { invalidate, useApi } from "./store";
import { ME, useSession } from "./session";
import type { Places } from "./types";

export type Scope = { scope: "india" | "district"; districtCode: string | null };

type ScopeCtx = Scope & {
  districtName?: string;
  places: Places | undefined;
  setScope: (s: Scope["scope"]) => void;
  chooseDistrict: (code: string) => void;
};

const Ctx = createContext<ScopeCtx | null>(null);
const KEY = "basky.scope.v1";

function loadSaved(): Scope | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return s && (s.scope === "india" || s.scope === "district") ? { scope: s.scope, districtCode: typeof s.districtCode === "string" ? s.districtCode : null } : null;
  } catch {
    return null;
  }
}

export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const places = useApi<Places>("/api/places").data;
  const [state, setState] = useState<Scope>({ scope: "india", districtCode: null });

  useEffect(() => {
    const saved = loadSaved();
    if (saved) setState(saved);
  }, []);

  const save = useCallback((next: Scope) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // private mode: keep it for this visit only
    }
  }, []);

  // Logged in with a home district, nothing chosen in this browser: use theirs
  useEffect(() => {
    if (!state.districtCode && user?.homeDistrictCode) save({ ...state, districtCode: user.homeDistrictCode });
  }, [user, state, save]);

  const setScope = useCallback((scope: Scope["scope"]) => save({ ...state, scope }), [state, save]);

  const chooseDistrict = useCallback(
    (code: string) => {
      save({ scope: "district", districtCode: code });
      if (user && user.homeDistrictCode !== code) {
        patch(ME, { homeDistrictCode: code })
          .then(() => invalidate(ME, `/api/users/${user.id}`))
          .catch(() => {});
      }
    },
    [save, user],
  );

  const districtName = places?.districts.find((d) => d.code === state.districtCode)?.name;
  const value = useMemo(() => ({ ...state, districtName, places, setScope, chooseDistrict }), [state, districtName, places, setScope, chooseDistrict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScope() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useScope outside ScopeProvider");
  return v;
}

/** District code for API calls when District scope is on, else null. */
export const scopedDistrict = (s: Scope) => (s.scope === "district" && s.districtCode ? s.districtCode : null);
