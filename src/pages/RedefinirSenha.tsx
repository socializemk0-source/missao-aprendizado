import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { authErrorMessage, passwordProblem } from '../auth/messages';
import { Loading } from '../auth/RequireAuth';
import { getSupabase } from '../lib/supabase';
import { AuthLayout } from './AuthLayout';

// Destino do link de "Esqueci minha senha": o Supabase abre uma sessão de
// recuperação a partir do link, e aqui a pessoa define a senha nova.
export function RedefinirSenha() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (status === 'loading') return <Loading />;
  if (status !== 'signedIn') {
    return (
      <AuthLayout title="Link inválido ou expirado" pose="apontando">
        <p className="muted">Peça um link novo em "Esqueci minha senha".</p>
        <Link to="/entrar" className="btn btn-primary btn-block">Voltar para entrar</Link>
      </AuthLayout>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password) ?? (password !== confirm ? 'As senhas não são iguais.' : null);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await (await getSupabase()).auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Senha atualizada!" pose="joinha">
        <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/jogar', { replace: true })}>Continuar estudando</button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Crie uma nova senha">
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="password">Nova senha</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="field-hint">Mínimo de 8 caracteres, com letras e números.</span>
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirme a nova senha</label>
          <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || !password}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
      </form>
    </AuthLayout>
  );
}
