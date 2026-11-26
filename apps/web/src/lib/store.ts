"use client";

// Tiny read cache for API GETs, keyed by path. Pages call useApi(path); anything that changes
// data calls invalidate("prefix") and every page showing a matching path fetches again.
// Paths double as keys, so invalidate("/api/clubs/") refreshes every club read.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ApiFailure, get } from "./api";

type Entry = { data?: unknown; error?: ApiFailure; at: number; promise?: Promise<void>; stale?: boolean };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function fetchInto(path: string): Promise<void> {
  const current = entries.get(path);
  if (current?.promise) return current.promise;
  const promise = get(path)
    .then((data) => {
      entries.set(path, { data, at: Date.now() });
    })
    .catch((e: unknown) => {
      const error = e instanceof ApiFailure ? e : new ApiFailure(0, "error", String(e));
      // Keep showing the last good copy if a refresh fails
      const prev = entries.get(path);
      entries.set(path, { data: prev?.data, error, at: Date.now() });
    })
    .finally(emit);
  entries.set(path, { ...(current ?? { at: 0 }), promise });
  return promise;
}

/** Fetch again everything whose path starts with one of these prefixes (only paths on screen refetch now). */
export function invalidate(...prefixes: string[]) {
  for (const [path, e] of entries) {
    if (prefixes.some((p) => path.startsWith(p))) entries.set(path, { ...e, stale: true });
  }
  emit();
}

/** Forget everything (login / logout: what you can see changes). */
export function clearAll() {
  entries.clear();
  emit();
}

/** Put a known value into the cache (e.g. after a change returns the new copy). */
export function setCached<T>(path: string, change: (old: T | undefined) => T) {
  const e = entries.get(path);
  entries.set(path, { at: Date.now(), ...e, data: change(e?.data as T | undefined) });
  emit();
}

export function peekCached<T>(path: string): T | undefined {
  return entries.get(path)?.data as T | undefined;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export type Loaded<T> = {
  data: T | undefined;
  error: ApiFailure | undefined;
  /** First load still running (nothing to show yet). */
  loading: boolean;
  reload: () => Promise<void>;
};

/** GET path through the cache. null = don't load (e.g. not logged in). */
export function useApi<T>(path: string | null): Loaded<T> {
  useSyncExternalStore(subscribe, () => version, () => 0);
  const e = path ? entries.get(path) : undefined;
  const needsFetch = !!path && (!e || e.stale) && !e?.promise;

  useEffect(() => {
    if (path && needsFetch) fetchInto(path);
  }, [path, needsFetch]);

  const reload = useCallback(async () => {
    if (path) {
      entries.set(path, { ...(entries.get(path) ?? { at: 0 }), stale: true });
      await fetchInto(path);
    }
  }, [path]);

  return {
    data: e?.data as T | undefined,
    error: e?.error,
    loading: !!path && e?.data === undefined && !e?.error,
    reload,
  };
}

/** Paged list ("load more"): first page through the cache, later pages appended here. */
export function usePaged<T, R>(path: string | null, pick: (r: R) => { items: T[]; nextCursor: string | null }) {
  const first = useApi<R>(path);
  const [more, setMore] = useState<{ base: string | null; items: T[]; cursor: string | null | undefined }>({ base: null, items: [], cursor: undefined });
  const [busy, setBusy] = useState(false);
  const page = first.data ? pick(first.data) : undefined;
  const extra = more.base === path ? more : { items: [] as T[], cursor: undefined };
  const cursor = extra.cursor === undefined ? page?.nextCursor : extra.cursor;

  const loadMore = async () => {
    if (!path || !cursor || busy) return;
    setBusy(true);
    try {
      const sep = path.includes("?") ? "&" : "?";
      const next = pick(await get<R>(`${path}${sep}cursor=${encodeURIComponent(cursor)}`));
      setMore({ base: path, items: [...extra.items, ...next.items], cursor: next.nextCursor });
    } finally {
      setBusy(false);
    }
  };

  // A refreshed first page may overlap the pages loaded after it: keep one copy of each item
  const seen = new Set<unknown>();
  const items = [...(page?.items ?? []), ...extra.items].filter((x) => {
    const id = (x as { id?: unknown }).id ?? x;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return { ...first, items, hasMore: !!cursor, loadMore, loadingMore: busy };
}
