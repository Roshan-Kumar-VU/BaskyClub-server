import { useCallback, useEffect, useState } from 'react';

/** Loads data from a repository function and re-runs when `deps` change. */
export function useData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  useEffect(() => {
    let alive = true;
    run().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [run]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [d] = await Promise.all([run(), new Promise((r) => setTimeout(r, 600))]);
    setData(d as T);
    setRefreshing(false);
  }, [run]);

  return { data, refreshing, refresh };
}
