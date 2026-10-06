// Aviso de cookies de anúncio: aparece até a pessoa escolher (ou quando ela
// pede para mudar a escolha). Com login, a escolha também vai para o servidor.

import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { escolherCookies, useCookies, type Escolha } from '../lib/consentimento';
import { sincronizarConsentimento } from '../lib/medicao';

export function AvisoCookies() {
  const { status, session } = useAuth();
  const { aviso } = useCookies();
  const userId = status === 'signedIn' ? session?.user.id : undefined;
  const sincronizado = useRef<string | null>(null);

  // Ao entrar na conta, leva para o servidor a escolha feita antes do login.
  useEffect(() => {
    if (!userId || sincronizado.current === userId) return;
    sincronizado.current = userId;
    void sincronizarConsentimento();
  }, [userId]);

  function escolher(escolha: Escolha) {
    escolherCookies(escolha);
    if (userId) void sincronizarConsentimento();
  }

  if (!aviso) return null;
  return (
    <section className="aviso-cookies" role="region" aria-label="Aviso de cookies">
      <p>
        Usamos cookies de anúncio da Meta (Facebook e Instagram) para saber quais anúncios trazem alunos. Eles só são ligados
        se você aceitar. Os cookies do login e das suas preferências funcionam sempre. <a href="/privacidade">Saiba mais</a>
      </p>
      <div className="aviso-cookies-botoes">
        <button type="button" className="btn btn-secondary" onClick={() => escolher('recusado')}>Recusar</button>
        <button type="button" className="btn btn-primary" onClick={() => escolher('aceito')}>Aceitar</button>
      </div>
    </section>
  );
}
