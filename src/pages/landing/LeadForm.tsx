import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';

// Captura de contato. O cadastro continua sendo a ação principal da página;
// isto é para quem ainda não quer criar conta.
export function LeadForm({ source = 'landing' }: { source?: 'landing' | 'landing-final' }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(''); // campo-isca para robôs
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError('Marque a autorização para receber nossos e-mails.');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, consent, source, website }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? 'Não foi possível enviar agora.');
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar agora.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div className="lead-done" role="status">
        <strong>Pronto! Você está na lista.</strong>
        <p>Vamos te mandar dicas de estudo e as novidades do Aprova Tico. Se quiser começar agora, a conta é grátis.</p>
        <Link to="/cadastro" className="btn btn-primary">Criar minha conta</Link>
      </div>
    );
  }

  const id = (field: string) => `${source}-${field}`;
  return (
    <form className="lead-form" onSubmit={onSubmit} noValidate>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div className="lead-fields">
        <div className="field">
          <label htmlFor={id('name')}>Seu nome</label>
          <input id={id('name')} autoComplete="given-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={id('email')}>Seu melhor e-mail</label>
          <input id={id('email')} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor={id('website')}>Site</label>
        <input id={id('website')} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label className="consent" htmlFor={id('consent')}>
        <input id={id('consent')} type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Aceito receber e-mails do Aprova Tico e li a <Link to="/privacidade">política de privacidade</Link>. Posso sair da lista quando quiser.</span>
      </label>
      <button className="btn btn-primary" disabled={state === 'sending' || !email.trim()}>{state === 'sending' ? 'Enviando…' : 'Quero receber'}</button>
    </form>
  );
}
