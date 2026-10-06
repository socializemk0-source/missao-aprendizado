// Aviso de cookies de marketing. Aceitar e Recusar com o mesmo destaque; sem
// escolha, nada de marketing carrega (ver src/lib/consentimento.ts).

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { aoMudarConsentimento, consentimentoEfetivo, definirConsentimento, exigeConsentimento } from '../lib/consentimento';

export function CookieBanner() {
  const [pendente, setPendente] = useState(() => consentimentoEfetivo() === 'pendente');
  useEffect(() => aoMudarConsentimento((c) => setPendente(c === 'pendente')), []);
  if (!exigeConsentimento() || !pendente) return null;

  return (
    <section className="cookie-banner" role="region" aria-label="Cookies e privacidade" data-no-track>
      <p>
        Usamos cookies para medir os nossos anúncios (Meta) e entender como o site é usado. Só começam se você aceitar, e você muda de ideia quando quiser na nossa{' '}
        <Link to="/privacidade#cookies">política de privacidade</Link>.
      </p>
      <div className="cookie-banner-actions">
        <button type="button" className="btn btn-secondary" onClick={() => definirConsentimento(false)}>Recusar</button>
        <button type="button" className="btn btn-secondary" onClick={() => definirConsentimento(true)}>Aceitar</button>
      </div>
    </section>
  );
}
