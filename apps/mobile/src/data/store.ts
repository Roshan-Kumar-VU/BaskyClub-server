/**
 * Tiny change signal for the in-memory mock data. Mutations call `bump()`,
 * screens call `useStoreVersion()` to re-render. When the API arrives this is
 * replaced by a query cache (e.g. TanStack Query).
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
