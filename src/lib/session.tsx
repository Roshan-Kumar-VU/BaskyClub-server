/**
 * Mock session. Real token login (shared Next.js API) replaces login()/logout().
 */
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getUser } from '@/data/repo';
import { useStoreVersion } from '@/data/store';
import type { User } from '@/types/models';

import { load, save } from './storage';

type Session = {
  user: User | undefined;
  ready: boolean;
  login: (userId: string) => void;
  logout: () => void;
  /** Run a member action, or show the login prompt for visitors. */
  requireLogin: (action: () => void) => void;
};

const Ctx = createContext<Session | null>(null);
export const DEMO_USER_ID = 'u-roshan';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useStoreVersion();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    load<string | null>('session.userId', null).then((id) => {
      setUserId(id);
      setReady(true);
    });
  }, []);

  const login = useCallback((id: string) => {
    setUserId(id);
    save('session.userId', id);
  }, []);

  const logout = useCallback(() => {
    setUserId(null);
    save('session.userId', null);
  }, []);

  const user = getUser(userId);

  const requireLogin = useCallback(
    (action: () => void) => {
      if (user) action();
      else router.push('/login-prompt');
    },
    [user],
  );

  const value = useMemo(() => ({ user, ready, login, logout, requireLogin }), [user, ready, login, logout, requireLogin]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
