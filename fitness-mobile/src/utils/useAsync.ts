import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/api/client';
import { useDataStore } from '@/store/data';

interface State<T> {
  data: T | null;
  error: string | null;
  /** Key + version + nonce the current data belongs to. */
  loadedFor: string | null;
}

/**
 * Loads data and reloads it whenever `key` changes, after pull-to-refresh, or when any screen
 * saves something (data version bump). Responses for an outdated key are dropped.
 */
export function useAsync<T>(fn: () => Promise<T>, key = '') {
  const version = useDataStore((s) => s.version);
  const [nonce, setNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<State<T>>({ data: null, error: null, loadedFor: null });
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const request = `${key}|${version}|${nonce}`;
  useEffect(() => {
    let stale = false;
    fnRef.current().then(
      (data) => {
        if (stale) return;
        setState({ data, error: null, loadedFor: request });
        setRefreshing(false);
      },
      (e) => {
        if (stale) return;
        setState((s) => ({ ...s, error: errorMessage(e), loadedFor: request }));
        setRefreshing(false);
      },
    );
    return () => {
      stale = true;
    };
  }, [request]);

  return {
    data: state.data,
    error: state.error,
    loading: state.loadedFor !== request,
    refreshing,
    refresh: () => {
      setRefreshing(true);
      setNonce((n) => n + 1);
    },
  };
}
