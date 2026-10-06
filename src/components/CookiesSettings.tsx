// Perfil → Cookies de anúncio: ver e mudar a escolha a qualquer momento.

import { useAuth } from '../auth/AuthProvider';
import { escolherCookies, sincronizarConsentimento, useCookies, type Escolha } from '../lib/consentimento';

const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

export function CookiesSettings() {
  const { status } = useAuth();
  const { escolha, em } = useCookies();

  function escolher(nova: Escolha) {
    escolherCookies(nova);
    if (status === 'signedIn') void sincronizarConsentimento();
  }

  return (
    <section className="card" aria-labelledby="cookies-titulo">
      <h2 id="cookies-titulo">Cookies de anúncio</h2>
      <p className="muted">
        {escolha === 'aceito' && em ? `Você aceitou em ${dia(em)}. Se recusar, paramos de enviar seus dados para a Meta a partir de agora.`
          : escolha === 'recusado' && em ? `Você recusou em ${dia(em)}. Nada do que você faz aqui é enviado para a Meta.`
            : 'Você ainda não escolheu. Enquanto isso, nada do que você faz aqui é enviado para a Meta.'}
      </p>
      {escolha === 'aceito'
        ? <button type="button" className="btn btn-secondary" onClick={() => escolher('recusado')}>Recusar cookies de anúncio</button>
        : <button type="button" className="btn btn-secondary" onClick={() => escolher('aceito')}>Aceitar cookies de anúncio</button>}
    </section>
  );
}
