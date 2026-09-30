// "Instalar o app" (no Perfil): botão no Android/Chrome, passo a passo no
// iPhone e aviso quando já está instalado. O aviso da Trilha traz para cá
// (/perfil#instalar).

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { promptInstall, usePwa } from '../lib/pwa';
import { Icon } from './Icon';

export function InstallCard() {
  const { canInstall, installed, ios } = usePwa();
  const { hash } = useLocation();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (hash === '#instalar') ref.current?.scrollIntoView?.({ block: 'start' });
  }, [hash]);

  return (
    <section ref={ref} id="instalar" className="card settings-card install-card" aria-labelledby="install-title">
      <h2 id="install-title" className="section-title">Instalar o app</h2>
      {installed ? (
        <p className="install-done">O Aprova Tico já está instalado neste aparelho.</p>
      ) : canInstall ? (
        <>
          <p className="muted settings-note">Fica na tela inicial do celular, abre em tela cheia e carrega mais rápido.</p>
          <button type="button" className="btn btn-primary" onClick={() => void promptInstall()}>
            <Icon name="download" size={20} /> Instalar o app
          </button>
        </>
      ) : ios ? (
        <>
          <p className="muted settings-note">No iPhone, a instalação é pelo Safari:</p>
          <ol className="install-steps">
            <li>Toque em <strong>Compartilhar</strong> <Icon name="share" size={18} className="install-inline-icon" /> na barra do Safari.</li>
            <li>Escolha <strong>Adicionar à Tela de Início</strong> <Icon name="plusSquare" size={18} className="install-inline-icon" />.</li>
            <li>Toque em <strong>Adicionar</strong>. O Tico aparece na sua tela inicial.</li>
          </ol>
        </>
      ) : (
        <p className="muted settings-note">
          Para instalar, abra o site no <strong>Chrome</strong> (Android ou computador), no <strong>Edge</strong> ou no{' '}
          <strong>Safari</strong> do iPhone. O botão de instalar aparece aqui.
        </p>
      )}
    </section>
  );
}
