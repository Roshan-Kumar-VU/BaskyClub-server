/**
 * Tiny change signal for the repository's cached API data (src/data/cache.ts, repo.ts).
 * Mutations call `bump()`, screens call `useStoreVersion()` to re-render.
 */
import { useSyncExternalStore } from 'react';

let version = 0;
const listeners = new Set<() => void>();

export function bump() {
  version++;
  listeners.forEach((l) => l());
}

export function useStoreVersion() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
}
