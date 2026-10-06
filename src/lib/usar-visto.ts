import { useCallback } from 'react';
import { useLocation } from 'react-router';
import { track } from './marketing';

// Dispara um evento próprio uma única vez quando o elemento aparece na tela.
// Só mede se houve consentimento (track() decide); sem IntersectionObserver
// (navegadores muito antigos), não mede nada.
export function useAoAparecer(evento: string) {
  const pagina = useLocation().pathname;
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el || typeof IntersectionObserver === 'undefined') return;
      const obs = new IntersectionObserver(
        (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          track(evento, { page: pagina }, { proprio: true });
          obs.disconnect();
        },
        { threshold: 0.5 },
      );
      obs.observe(el);
      return () => obs.disconnect();
    },
    [evento, pagina],
  );
}
