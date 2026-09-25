import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { authErrorMessage, passwordProblem } from '../auth/messages';
import { Loading } from '../auth/RequireAuth';
import { Icon } from '../components/Icon';
import { getSupabase } from '../lib/supabase';
import { AuthLayout } from './AuthLayout';

export function Cadastro() {
  const { status } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (status === 'signedIn') return <Navigate to="/jogar" replace />;
  if (status === 'loading') return <Loading />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = !name.trim()
      ? 'Digite seu nome.'
      : passwordProblem(password) ?? (password !== confirm ? 'As senhas não são iguais.' : null);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const { data, error: err } = await (await getSupabase()).auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/entrar` },
      });
      if (err) throw err;
      // O Supabase não dá erro para e-mail já cadastrado (anti-enumeração):
      // devolve um usuário sem identidades. Sem esta checagem, parecia que
      // o cadastro tinha dado certo.
      if (data.user && data.user.identities?.length === 0) throw new Error('User already registered');
      if (!data.session) setSentTo(email.trim()); // precisa confirmar o e-mail
      // Com sessão, o AuthProvider percebe e esta tela redireciona.
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    const { error: err } = await (await getSupabase()).auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/entrar` },
    });
    if (err) setError(authErrorMessage(err));
  }

  if (sentTo) {
    return (
      <AuthLayout title="Confirme seu e-mail" pose="joinha">
        <p className="alert alert-success" role="status">Conta criada! Enviamos um link de confirmação para <strong>{sentTo}</strong>. Clique nele e depois entre com sua senha.</p>
        <Link to="/entrar" className="btn btn-primary btn-block">Ir para entrar</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Crie sua conta grátis" subtitle="Seu progresso fica salvo em qualquer aparelho.">
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-secondary btn-block" onClick={() => void onGoogle()} disabled={busy}>
        <Icon name="google" size={20} /> Continuar com Google
      </button>
      <p className="divider">ou com e-mail</p>
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Nome</label>
          <input id="name" autoComplete="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="password-hint" />
          <span id="password-hint" className="field-hint">Mínimo de 8 caracteres, com letras e números.</span>
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirme a senha</label>
          <input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || !email.trim() || !password}>{busy ? 'Criando conta…' : 'Criar conta'}</button>
      </form>
      <p className="auth-footer">Já tem conta? <Link to="/entrar">Entrar</Link></p>
    </AuthLayout>
  );
}
