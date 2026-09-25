import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { authErrorMessage } from '../auth/messages';
import { Loading, safeNext } from '../auth/RequireAuth';
import { Icon } from '../components/Icon';
import { getSupabase } from '../lib/supabase';
import { AuthLayout } from './AuthLayout';

type Mode = 'login' | 'reset';

export function Entrar() {
  const { status } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Já logado (inclusive voltando do Google): direto para o app.
  if (status === 'signedIn') return <Navigate to={next} replace />;
  if (status === 'loading') return <Loading />;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onLogin(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const { error: err } = await (await getSupabase()).auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
      // O AuthProvider percebe a sessão nova e esta tela redireciona.
    });
  }

  function onReset(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const { error: err } = await (await getSupabase()).auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (err) throw err;
      // Mesma mensagem exista ou não a conta (não revela quem é cadastrado).
      setNotice(`Se houver uma conta com ${email.trim()}, você vai receber um link para criar uma nova senha.`);
    });
  }

  function onGoogle() {
    void run(async () => {
      const { error: err } = await (await getSupabase()).auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/entrar?next=${encodeURIComponent(next)}` },
      });
      if (err) throw err;
    });
  }

  if (mode === 'reset') {
    return (
      <AuthLayout title="Esqueceu a senha?" subtitle="Digite seu e-mail e enviamos um link para criar uma nova." pose="apontando">
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        {notice && <p className="alert alert-success" role="status">{notice}</p>}
        <form onSubmit={onReset} noValidate>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy || !email.trim()}>{busy ? 'Enviando…' : 'Enviar link'}</button>
        </form>
        <p className="auth-footer"><button type="button" className="link-btn" onClick={() => setMode('login')}>Voltar para entrar</button></p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Que bom te ver de novo!" subtitle="Entre para continuar sua trilha.">
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-secondary btn-block" onClick={onGoogle} disabled={busy}>
        <Icon name="google" size={20} /> Continuar com Google
      </button>
      <p className="divider">ou com e-mail</p>
      <form onSubmit={onLogin} noValidate>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || !email.trim() || !password}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p className="auth-footer">
        <button type="button" className="link-btn" onClick={() => setMode('reset')}>Esqueci minha senha</button>
        <span> · </span>
        <Link to={`/cadastro${next !== '/jogar' ? `?next=${encodeURIComponent(next)}` : ''}`}>Criar conta grátis</Link>
      </p>
    </AuthLayout>
  );
}
