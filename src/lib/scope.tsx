/**
 * Global scope: All India ↔ District. One store, shared by Home, Matches and
 * Clubs, persisted to device storage (APP_NAV section 4).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getDistrict, setHomeDistrict, type Scope } from '@/data/repo';

import { useSession } from './session';
import { load, save } from './storage';

type ScopeCtx = Scope & {
  ready: boolean;
  districtName?: string;
  setScope: (s: Scope['scope']) => void;
  /** Set the district and switch to District scope. Logged-in users also save it as home district. */
  chooseDistrict: (code: string) => void;
};

const Ctx = createContext<ScopeCtx | null>(null);
const KEY = 'scope.v1';

export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const [state, setState] = useState<Scope>({ scope: 'india', districtCode: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    load<Scope>(KEY, { scope: 'india', districtCode: null }).then((s) => {
      setState(s);
      setReady(true);
    });
  }, []);

  // A logged-in user with a home district but no device district: use theirs.
  useEffect(() => {
    if (ready && !state.districtCode && user?.homeDistrictCode) {
      const next = { ...state, districtCode: user.homeDistrictCode };
      setState(next);
      save(KEY, next);
    }
  }, [ready, user, state]);

  const update = useCallback((next: Scope) => {
    setState(next);
    save(KEY, next);
  }, []);

  const setScope = useCallback((scope: Scope['scope']) => update({ ...state, scope }), [state, update]);

  const chooseDistrict = useCallback(
    (code: string) => {
      update({ scope: 'district', districtCode: code });
      if (user) setHomeDistrict(user.userId, code);
    },
    [update, user],
  );

  const value = useMemo(
    () => ({ ...state, ready, districtName: getDistrict(state.districtCode)?.name, setScope, chooseDistrict }),
    [state, ready, setScope, chooseDistrict],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScope() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useScope outside ScopeProvider');
  return v;
}
