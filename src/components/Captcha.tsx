// CAPTCHA (Cloudflare Turnstile) nas telas de login, cadastro e "esqueci a
// senha". Só aparece quando o servidor informa uma chave (TURNSTILE_SITE_KEY);
// sem ela, nada muda. O token vai junto do pedido ao Supabase, que confere
// com a chave secreta (configurada no painel do Supabase). Cada token vale
// uma vez: depois de cada tentativa a verificação recomeça.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { getCaptchaSiteKey } from '../lib/supabase';

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id: string): void;
}

declare global {
  interface Window { turnstile?: Turnstile }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let carregando: Promise<void> | null = null;

function carregarTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  carregando ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      carregando = null;
      reject(new Error('captcha indisponível'));
    };
    document.head.appendChild(s);
  });
  return carregando;
}

// resetKey: quando muda (ex.: login ↔ "esqueci a senha"), o widget é recriado.
export function useCaptcha(resetKey: unknown = null): {
  element: ReactNode;
  ready: boolean;
  options: { captchaToken?: string };
  reset: () => void;
} {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    let ativo = true;
    getCaptchaSiteKey().then((k) => ativo && setSiteKey(k)).catch(() => {});
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!siteKey) return;
    let ativo = true;
    setToken(null);
    carregarTurnstile().then(() => {
      if (!ativo || !box.current || !window.turnstile) return;
      widget.current = window.turnstile.render(box.current, {
        sitekey: siteKey,
        language: 'pt-br',
        callback: (t: string) => ativo && setToken(t),
        'expired-callback': () => ativo && setToken(null),
        'error-callback': () => ativo && setToken(null),
      });
    }).catch(() => ativo && setFalhou(true));
    return () => {
      ativo = false;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, resetKey]);

  const reset = useCallback(() => {
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    setToken(null);
  }, []);

  const element = siteKey ? (
    <div className="captcha">
      <div ref={box} />
      {falhou
        ? <p className="field-hint is-bad" role="alert">Não foi possível carregar a verificação. Recarregue a página.</p>
        : !token && <p className="field-hint">Confirme que você não é um robô para continuar.</p>}
    </div>
  ) : null;

  return { element, ready: !siteKey || Boolean(token), options: token ? { captchaToken: token } : {}, reset };
}
