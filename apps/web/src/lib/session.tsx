"use client";

// Who is logged in. The login cookie is httpOnly (set by /session/*), so the page learns who you
// are from GET /api/auth/me: 401 means a visitor.

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { ApiFailure, post } from "./api";
import { clearAll, useApi } from "./store";
import type { Me } from "./types";

export type SignupInput = {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string; // YYYY-MM-DD
  password: string;
  gender?: "male" | "female" | "other";
  homeDistrictCode?: string;
  parentName?: string;
  parentEmail?: string;
};

type Session = {
  user: Me | undefined;
  /** Finished asking the API who this is. */
  ready: boolean;
  login: (login: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<{ awaitingParent: boolean; parentConsentLink?: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  /** Run a member action, or send visitors to log in (and back here after). */
  requireLogin: (action: () => void) => void;
  isMod: boolean;
  isTeam: boolean;
};

const Ctx = createContext<Session | null>(null);
export const ME = "/api/auth/me";

/** Test accounts from the server seed (password Basky@123), listed on the login page in development. */
export const TEST_ACCOUNTS = [
  { label: "Player", email: "player@test.baskyclub.in" },
  { label: "Club owner", email: "club.owner@test.baskyclub.in" },
  { label: "Club admin", email: "club.admin@test.baskyclub.in" },
  { label: "Under-18, waiting for parent", email: "minor.pending@test.baskyclub.in" },
  { label: "No club", email: "user@test.baskyclub.in" },
  { label: "District association admin", email: "vellore.admin@test.baskyclub.in" },
  { label: "Moderator", email: "moderator@test.baskyclub.in" },
  { label: "Basky team", email: "baskyteam@test.baskyclub.in" },
  { label: "Super admin", email: "superadmin@test.baskyclub.in" },
] as const;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useApi<Me>(ME);
  // 401: visitor. Other errors (API down): treat as visitor for now, pages show their own errors.
  const user = me.data && !(me.error instanceof ApiFailure && me.error.status === 401) ? me.data : undefined;
  const ready = !me.loading;

  // A login cookie the API refuses (expired, account gone): clear it, or every request keeps failing
  const expired = me.error instanceof ApiFailure && me.error.status === 401;
  useEffect(() => {
    if (expired && document.cookie.split("; ").some((c) => c.startsWith("basky_in="))) {
      post("/session/logout")
        .catch(() => {})
        .finally(clearAll);
    }
  }, [expired]);

  const login = useCallback(async (loginId: string, password: string) => {
    await post("/session/login", { login: loginId, password });
    clearAll();
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const r = await post<{ awaitingParent?: boolean; parentConsentLink?: string }>("/session/signup", input);
    clearAll();
    return { awaitingParent: !!r.awaitingParent, parentConsentLink: r.parentConsentLink };
  }, []);

  const logout = useCallback(async () => {
    await post("/session/logout");
    clearAll();
    router.push("/");
  }, [router]);

  const refreshMe = useCallback(() => me.reload(), [me]);

  const requireLogin = useCallback(
    (action: () => void) => {
      if (user) action();
      else router.push(`/login?next=${encodeURIComponent(pathname)}`);
    },
    [user, router, pathname],
  );

  const roles = user?.platformRoles ?? [];
  const isMod = roles.length > 0;
  const isTeam = roles.includes("basky_admin") || roles.includes("super_admin");

  const value = useMemo(
    () => ({ user, ready, login, signup, logout, refreshMe, requireLogin, isMod, isTeam }),
    [user, ready, login, signup, logout, refreshMe, requireLogin, isMod, isTeam],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

