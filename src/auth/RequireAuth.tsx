import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';

export function FullScreenMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="center-screen">
      <div>
        <h1 className="page-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="center-screen" role="status" aria-live="polite">
      <div><div className="spinner" /><p className="muted">Carregando…</p></div>
    </div>
  );
}

// Telas do app: só com login. Sem login → /entrar, voltando depois para
// a página que a pessoa tentou abrir.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Loading />;
  if (status === 'unavailable') {
    return <FullScreenMessage title="Login indisponível"><p className="muted">Não conseguimos falar com o servidor. Tente de novo em instantes.</p></FullScreenMessage>;
  }
  if (status === 'signedOut') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/entrar?next=${next}`} replace />;
  }
  return <>{children}</>;
}

// Só aceita caminhos internos em ?next= (nunca redireciona para outro site).
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/jogar';
  return raw;
}
