// XP, vidas e sequência do aluno, mostrados no cabeçalho. O servidor é a
// fonte: cada resposta devolve o progresso atualizado.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Progress } from '../../shared/game';
import { useAuth } from '../auth/AuthProvider';
import { game } from '../lib/game';

interface ProgressValue {
  progress: Progress | null;
  setProgress: (p: Progress) => void;
  refresh: () => Promise<void>;
}

const ProgressContext = createContext<ProgressValue>({ progress: null, setProgress: () => {}, refresh: async () => {} });

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { status, session } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const userId = session?.user.id;

  const refresh = useCallback(async () => {
    try {
      setProgress(await game.progress());
    } catch {
      // Cabeçalho sem números é melhor que uma tela de erro; as telas
      // que dependem do progresso mostram o próprio erro.
    }
  }, []);

  useEffect(() => {
    if (status === 'signedIn' && userId) void refresh();
    if (status === 'signedOut') setProgress(null);
  }, [status, userId, refresh]);

  const value = useMemo(() => ({ progress, setProgress, refresh }), [progress, refresh]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export const useProgress = () => useContext(ProgressContext);

export function ProgressTestProvider({ value, children }: { value: Partial<ProgressValue>; children: ReactNode }) {
  return <ProgressContext.Provider value={{ progress: null, setProgress: () => {}, refresh: async () => {}, ...value }}>{children}</ProgressContext.Provider>;
}
