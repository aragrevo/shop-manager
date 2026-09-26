import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Minimal data-fetching hook with loading / success / error states.
 * Pass a stable `key` (e.g. a serialized query) to control refetching.
 */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  key: string,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);

    fnRef
      .current(controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, nonce]);

  const refetch = useCallback(() => setNonce((value) => value + 1), []);

  return { data, loading, error, refetch };
}
