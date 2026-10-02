// Aviso de instalar o app, no topo da Trilha. Só aparece quando dá para
// instalar e ainda não está instalado; fechado, volta depois de 30 dias.

import { Link } from 'react-router';
import { dismissInstallBanner, installBannerDismissed, promptInstall, usePwa } from '../lib/pwa';
import { Icon } from './Icon';

export function InstallBanner() {
  const { canInstall, installed, ios } = usePwa();
  if (installed || installBannerDismissed() || !(canInstall || ios)) return null;

  return (
    <aside className="install-banner" aria-label="Instalar o app">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="install-banner-icon" />
      <p><strong>Instale o Aprova Tico</strong>: abre como app, em tela cheia, e carrega mais rápido.</p>
      {canInstall ? (
        <button type="button" className="btn btn-primary install-banner-btn" onClick={() => void promptInstall()}>Instalar</button>
      ) : (
        <Link to="/perfil#instalar" className="btn btn-primary install-banner-btn">Como instalar</Link>
      )}
      <button type="button" className="icon-btn install-banner-close" aria-label="Fechar aviso de instalar" onClick={dismissInstallBanner}>
        <Icon name="close" size={18} />
      </button>
    </aside>
  );
}
