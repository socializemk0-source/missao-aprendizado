import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../lib/api';

export interface Loaded<T> {
  data: T | null;
  error: ApiError | Error | null;
  loading: boolean;
  reload: () => void;
}

// Carrega algo da API ao abrir a tela, com erro e "tentar de novo".
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    run()
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(e instanceof Error ? e : new Error('Algo deu errado.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [run, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}

export function LoadState({ loaded, children }: { loaded: Loaded<unknown>; children: ReactNode }) {
  if (loaded.loading && !loaded.data) {
    return <div className="load-state" role="status"><div className="spinner" /><p className="muted">Carregando…</p></div>;
  }
  if (loaded.error) {
    return (
      <div className="load-state" role="alert">
        <p>{loaded.error.message}</p>
        <button type="button" className="btn btn-secondary" onClick={loaded.reload}>Tentar de novo</button>
      </div>
    );
  }
  return <>{children}</>;
}
