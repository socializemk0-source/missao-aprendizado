// Estado de login do app. A sessão do Supabase é a ÚNICA fonte da verdade:
// não existe cache próprio de "usuário logado" que possa ficar desatualizado.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { api, type Me, type Profile } from '../lib/api';
import { getSupabase } from '../lib/supabase';

type Status = 'loading' | 'signedOut' | 'signedIn' | 'unavailable';

interface AuthContextValue {
  status: Status;
  session: Session | null;
  me: Me | null;
  meError: string | null;
  refreshMe: () => Promise<void>;
  updateProfile: (fields: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    getSupabase()
      .then(async (supabase) => {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        setStatus(data.session ? 'signedIn' : 'signedOut');
        // Dentro deste callback NÃO se chama nenhum método de supabase.auth
        // (trava documentada do SDK) — só atualiza o estado.
        const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
          setSession(next);
          setStatus(next ? 'signedIn' : 'signedOut');
          if (!next) setMe(null);
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      })
      .catch(() => active && setStatus('unavailable'));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const userId = session?.user.id;
  const refreshMe = useCallback(async () => {
    try {
      setMe(await api<Me>('/api/me'));
      setMeError(null);
    } catch (err) {
      setMeError(err instanceof Error ? err.message : 'Não foi possível carregar seu perfil.');
    }
  }, []);

  // Perfil é carregado (e criado no 1º acesso) sempre que muda o usuário.
  useEffect(() => {
    if (userId) void refreshMe();
  }, [userId, refreshMe]);

  const updateProfile = useCallback(async (fields: Partial<Profile>) => {
    setMe(await api<Me>('/api/me', { method: 'PATCH', body: JSON.stringify(fields) }));
  }, []);

  const signOut = useCallback(async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    setMe(null);
  }, []);

  const value = useMemo(
    () => ({ status, session, me, meError, refreshMe, updateProfile, signOut }),
    [status, session, me, meError, refreshMe, updateProfile, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

// Para testes de tela: um provedor com valores fixos.
export function AuthTestProvider({ value, children }: { value: Partial<AuthContextValue>; children: ReactNode }) {
  const noop = async () => {};
  const full: AuthContextValue = {
    status: 'signedOut', session: null, me: null, meError: null,
    refreshMe: noop, updateProfile: noop, signOut: noop, ...value,
  };
  return <AuthContext.Provider value={full}>{children}</AuthContext.Provider>;
}
