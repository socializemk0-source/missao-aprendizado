import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { authErrorMessage, passwordProblem } from '../auth/messages';
import { Loading } from '../auth/RequireAuth';
import { useCaptcha } from '../components/Captcha';
import { Icon } from '../components/Icon';
import { ApiError } from '../lib/api';
import { pedirAuth } from '../lib/auth-api';
import { track } from '../lib/marketing';
import { getSupabase } from '../lib/supabase';
import { useAoAparecer } from '../lib/usar-visto';
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
  const captcha = useCaptcha(null, { action: 'signup' }); // conferido em /api/auth
  const navigate = useNavigate();
  const formVisto = useAoAparecer('at_signup_form_viewed');
  const comecou = useRef(false);

  if (status === 'signedIn') return <Navigate to="/hoje" replace />;
  if (status === 'loading') return <Loading />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = !name.trim()
      ? 'Digite seu nome.'
      : passwordProblem(password) ?? (password !== confirm ? 'As senhas não são iguais.' : null);
    if (problem) {
      track('at_signup_form_error', { error_type: 'validacao', page: '/cadastro' }, { proprio: true });
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      // E-mail já cadastrado volta como erro (409) do /api/auth.
      const r = await pedirAuth('signup', {
        name: name.trim(), email: email.trim(), password, redirectTo: `${window.location.origin}/entrar`, ...captcha.options,
      });
      track('CompleteRegistration', { status: 'email', content_name: 'cadastro' });
      if (r.confirmar === false) navigate('/entrar', { replace: true }); // conta já confirmada: é só entrar
      else setSentTo(email.trim()); // precisa confirmar o e-mail
    } catch (err) {
      track('at_signup_form_error', { error_type: 'servico', page: '/cadastro' }, { proprio: true });
      setError(err instanceof ApiError ? err.message : authErrorMessage(err));
    } finally {
      setBusy(false);
      captcha.reset(); // o token do CAPTCHA vale uma vez
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
      <form ref={formVisto} onSubmit={onSubmit} noValidate onFocus={() => {
        if (comecou.current) return;
        comecou.current = true;
        track('at_signup_form_started', { page: '/cadastro' }, { proprio: true });
      }}>
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
        {captcha.element}
        <button className="btn btn-primary btn-block" disabled={busy || !email.trim() || !password || !captcha.ready}>{busy ? 'Criando conta…' : 'Criar conta'}</button>
        <p className="field-hint auth-termos">Ao criar a conta, você concorda com os <Link to="/termos">Termos de uso</Link> e a <Link to="/privacidade">Política de privacidade</Link>.</p>
      </form>
      <p className="auth-footer">Já tem conta? <Link to="/entrar">Entrar</Link></p>
    </AuthLayout>
  );
}
