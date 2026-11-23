/**
 * Small read-through cache. Screens read synchronously (as before); the first read
 * of a key starts a fetch and returns `fallback`; when the answer arrives the
 * store version bumps and screens re-render with the data.
 */
import { bump } from './store';

type Entry = { value?: unknown; loading?: Promise<void>; at: number; error?: Error };
const entries = new Map<string, Entry>();
const STALE_MS = 60_000;

export function read<T>(key: string, fetcher: () => Promise<T>, fallback: T): T {
  const e = entries.get(key);
  const stale = !e || (Date.now() - e.at > STALE_MS && !e.loading);
  if (stale) load(key, fetcher);
  return e && 'value' in e && e.value !== undefined ? (e.value as T) : fallback;
}

export function load<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
  const e = entries.get(key) ?? { at: 0 };
  if (e.loading) return e.loading;
  e.loading = fetcher()
    .then((value) => {
      e.value = value;
      e.error = undefined;
    })
    .catch((err: Error) => {
      e.error = err;
      // Keep the old value; mark as "known" so a 404 doesn't refetch forever
      if (!('value' in e)) e.value = undefined;
    })
    .finally(() => {
      e.at = Date.now();
      e.loading = undefined;
      bump();
    });
  entries.set(key, e);
  return e.loading;
}

/** Has the key been fetched at least once (successfully or not)? */
export const isLoaded = (key: string) => (entries.get(key)?.at ?? 0) > 0;
export const errorOf = (key: string) => entries.get(key)?.error;

export function peek<T>(key: string): T | undefined {
  return entries.get(key)?.value as T | undefined;
}

export function put<T>(key: string, value: T) {
  entries.set(key, { value, at: Date.now() });
  bump();
}

/** Change a cached value in place (e.g. an instant like). */
export function update<T>(key: string, change: (v: T) => T) {
  const e = entries.get(key);
  if (e && e.value !== undefined) {
    e.value = change(e.value as T);
    bump();
  }
}

export function keys(prefix: string) {
  return [...entries.keys()].filter((k) => k.startsWith(prefix));
}

/** Forget keys (by prefix) so the next read fetches fresh data. */
export function invalidate(...prefixes: string[]) {
  for (const k of [...entries.keys()]) {
    if (prefixes.some((p) => k.startsWith(p))) {
      const e = entries.get(k)!;
      e.at = 0; // stale: next read refetches, old value shows meanwhile
    }
  }
  bump();
}

export function clearAll() {
  entries.clear();
  bump();
}
