import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { AppearanceSettings } from '../components/AppearanceSettings';
import { CookiesSettings } from '../components/CookiesSettings';
import { Icon } from '../components/Icon';
import { InstallCard } from '../components/InstallCard';
import { api } from '../lib/api';

export const BANCAS = ['Cebraspe', 'FGV', 'FCC', 'Vunesp', 'Cesgranrio', 'Outra'];

export function Perfil() {
  const { me, meError, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', targetExam: '', preferredBanca: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!me) return;
    setForm({
      displayName: me.profile.displayName,
      targetExam: me.profile.targetExam ?? '',
      preferredBanca: me.profile.preferredBanca ?? '',
      city: me.profile.city ?? '',
    });
  }, [me]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({
        displayName: form.displayName,
        targetExam: form.targetExam.trim() || null,
        preferredBanca: form.preferredBanca || null,
        city: form.city.trim() || null,
      });
      setMessage({ kind: 'ok', text: 'Perfil salvo.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Não foi possível salvar.' });
    } finally {
      setSaving(false);
    }
  }

  async function onSignOut() {
    if (!window.confirm('Sair da sua conta neste aparelho?')) return;
    // Primeiro sai desta tela: se a sessão acabasse aqui, a proteção das
    // telas do app mandaria para /entrar em vez da página inicial.
    navigate('/', { replace: true });
    await signOut();
  }

  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  async function onExcluir(e: FormEvent) {
    e.preventDefault();
    if (confirmacao !== 'EXCLUIR') return;
    setExcluindo(true);
    setErroExcluir(null);
    try {
      await api('/api/me', { method: 'DELETE', body: JSON.stringify({ confirmar: confirmacao }) });
    } catch (err) {
      setErroExcluir(err instanceof Error ? err.message : 'Não foi possível excluir a conta agora.');
      setExcluindo(false);
      return;
    }
    // A conta não existe mais: sai desta tela antes de encerrar a sessão
    // (senão a proteção das telas do app levaria para /entrar).
    navigate('/', { replace: true, state: { aviso: 'Sua conta foi excluída. Seus dados de estudo foram apagados.' } });
    await signOut().catch(() => {});
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <p className="eyebrow">Meu perfil</p>
      <h1 className="page-title">{me?.profile.displayName ?? 'Minha conta'}</h1>
      <p className="muted">{me?.user.email}</p>

      {meError && <p className="alert alert-error" role="alert">{meError}</p>}

      <form className="card profile-card" onSubmit={onSave}>
        {message && <p className={`alert ${message.kind === 'ok' ? 'alert-success' : 'alert-error'}`} role="status">{message.text}</p>}
        <div className="field">
          <label htmlFor="displayName">Nome</label>
          <input id="displayName" maxLength={60} required value={form.displayName} onChange={set('displayName')} />
        </div>
        <div className="field">
          <label htmlFor="targetExam">Concurso que você quer passar</label>
          <input id="targetExam" maxLength={80} placeholder="Ex.: Polícia Federal — Agente" value={form.targetExam} onChange={set('targetExam')} />
        </div>
        <div className="field">
          <label htmlFor="preferredBanca">Banca</label>
          <select id="preferredBanca" value={form.preferredBanca} onChange={set('preferredBanca')}>
            <option value="">Ainda não sei</option>
            {BANCAS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="city">Cidade</label>
          <input id="city" maxLength={80} value={form.city} onChange={set('city')} />
        </div>
        <button className="btn btn-primary" disabled={saving || !me || !form.displayName.trim()}>{saving ? 'Salvando…' : 'Salvar'}</button>
      </form>

      <AppearanceSettings />
      <InstallCard />
      <CookiesSettings />

      <button type="button" className="btn btn-danger signout-btn" onClick={() => void onSignOut()}>
        <Icon name="logout" size={20} /> Sair da conta
      </button>

      <form className="card danger-zone" onSubmit={(e) => void onExcluir(e)} aria-labelledby="excluir-conta">
        <h2 id="excluir-conta">Excluir minha conta</h2>
        <p className="muted">
          Apaga para sempre seu perfil, progresso, XP, respostas, plano de estudos, redações, simulados e jogos, e remove seu
          login. Não dá para desfazer. Os registros de pagamento do PRO ficam guardados, sem seu nome e e-mail, porque a
          lei exige. Veja a <Link to="/privacidade">Política de privacidade</Link>.
        </p>
        {erroExcluir && <p className="alert alert-error" role="alert">{erroExcluir}</p>}
        <div className="field">
          <label htmlFor="confirmar-exclusao">Digite EXCLUIR para confirmar</label>
          <input id="confirmar-exclusao" autoComplete="off" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
        </div>
        <button className="btn btn-danger" disabled={excluindo || confirmacao !== 'EXCLUIR'}>{excluindo ? 'Excluindo…' : 'Excluir minha conta'}</button>
      </form>
    </>
  );
}
