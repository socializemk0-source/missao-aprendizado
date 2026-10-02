// Avisos que valem em qualquer tela: internet caiu e versão nova do app.

import { applyUpdate, usePwaNotices } from '../lib/pwa';

export function PwaNotices() {
  const { online, updateReady } = usePwaNotices();
  return (
    <div className="pwa-notices">
      {!online && (
        <p className="pwa-notice pwa-offline" role="status">
          Sem internet. O que você responder agora pode não ser salvo; continue quando a conexão voltar.
        </p>
      )}
      {updateReady && (
        <div className="pwa-notice pwa-update" role="alert">
          <span>Tem uma versão nova do app.</span>
          <button type="button" className="btn btn-primary" onClick={applyUpdate}>Atualizar</button>
        </div>
      )}
    </div>
  );
}
