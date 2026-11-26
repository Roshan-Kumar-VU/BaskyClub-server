// Reads live data from the repository cache: opt out of React Compiler memoisation so updates show.
'use no memo';

/**
 * Session: real login against the shared API. The login token is kept on the
 * device and sent with every request; "me" comes from GET /api/auth/me.
 */
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ApiError, post, setToken } from '@/data/api';
import { clearAll, load as loadKey, peek, read } from '@/data/cache';
import { fetchMe, loadPlaces, type Me, setViewer } from '@/data/repo';
import { useStoreVersion } from '@/data/store';

import { registerForPush, unregisterPush } from './push';
import { load, save } from './storage';

export type SignupInput = {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string; // YYYY-MM-DD
  password: string;
  gender?: 'male' | 'female' | 'other';
  homeDistrictCode?: string;
  parentName?: string;
  parentEmail?: string;
};

type Session = {
  user: Me | undefined;
  ready: boolean;
  login: (login: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<{ awaitingParent: boolean; parentConsentLink?: string }>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  /** Run a member action, or show the login prompt for visitors. */
  requireLogin: (action: () => void) => void;
};

const Ctx = createContext<Session | null>(null);
const TOKEN_KEY = 'session.token';

/** Test accounts from the server seed (password Basky@123) — shown on the login screen in development. */
export const TEST_ACCOUNTS = [
  { label: 'Player', email: 'player@test.baskyclub.in' },
  { label: 'Club owner', email: 'club.owner@test.baskyclub.in' },
  { label: 'Club admin', email: 'club.admin@test.baskyclub.in' },
  { label: 'Captain', email: 'captain@test.baskyclub.in' },
  { label: 'Coach', email: 'coach@test.baskyclub.in' },
  { label: 'Under-18 player', email: 'minor.player@test.baskyclub.in' },
  { label: 'Under-18, waiting for parent', email: 'minor.pending@test.baskyclub.in' },
  { label: 'No club', email: 'user@test.baskyclub.in' },
  { label: 'Creator', email: 'creator@test.baskyclub.in' },
  { label: 'District association admin', email: 'vellore.admin@test.baskyclub.in' },
  { label: 'State association (TNBA)', email: 'tnba.admin@test.baskyclub.in' },
  { label: 'Moderator', email: 'moderator@test.baskyclub.in' },
  { label: 'Basky team', email: 'baskyteam@test.baskyclub.in' },
  { label: 'Super admin', email: 'superadmin@test.baskyclub.in' },
] as const;
export const TEST_PASSWORD = 'Basky@123';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useStoreVersion();
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);

  const startSession = useCallback(async (token: string) => {
    setToken(token);
    await loadKey('me', fetchMe);
    if (peek<Me>('me')) {
      setSignedIn(true);
      registerForPush(); // in the background; never blocks or breaks login
    } else {
      setToken(null);
      save(TOKEN_KEY, null);
    }
  }, []);

  useEffect(() => {
    loadPlaces();
    load<string | null>(TOKEN_KEY, null)
      .then(async (token) => {
        if (token) await startSession(token);
      })
      .finally(() => setReady(true));
  }, [startSession]);

  const login = useCallback(
    async (loginId: string, password: string) => {
      const r = await post<{ token: string }>('/api/auth/login', { login: loginId, password });
      clearAll();
      loadPlaces();
      await save(TOKEN_KEY, r.token);
      await startSession(r.token);
    },
    [startSession],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const r = await post<{ token: string; awaitingParent?: boolean; parentConsentLink?: string }>('/api/auth/signup', input);
      clearAll();
      loadPlaces();
      await save(TOKEN_KEY, r.token);
      await startSession(r.token);
      return { awaitingParent: !!r.awaitingParent, parentConsentLink: r.parentConsentLink };
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    await unregisterPush(); // while still logged in, so this phone stops getting this account's alerts
    setToken(null);
    save(TOKEN_KEY, null);
    setSignedIn(false);
    clearAll();
    loadPlaces();
  }, []);

  const refreshMe = useCallback(async () => {
    await loadKey('me', fetchMe);
  }, []);

  // read() refetches "me" after something changes it (e.g. home district)
  const user = signedIn ? read<Me | undefined>('me', fetchMe, undefined) : undefined;
  setViewer(user?.userId);

  const requireLogin = useCallback(
    (action: () => void) => {
      if (user) action();
      else router.push('/login-prompt');
    },
    [user],
  );

  const value = useMemo(() => ({ user, ready, login, signup, logout, refreshMe, requireLogin }), [user, ready, login, signup, logout, refreshMe, requireLogin]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

/** A readable message for any error from the API. */
export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Something went wrong.');
