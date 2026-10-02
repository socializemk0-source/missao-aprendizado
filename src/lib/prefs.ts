// Preferências do aluno neste aparelho: tema, som, animações e modo foco.
// Ficam no localStorage (pode falhar em aba anônima: aí vale o padrão) e são
// aplicadas na página por atributos no <html>, que o CSS usa:
//   data-theme="light|dark"  data-motion="on|off"  data-focus="on"
//   data-reading="sepia"     (tom creme no modo foco)

import { useSyncExternalStore } from 'react';

// Padrão: claro. O escuro só liga quando o aluno escolhe (botão da lua ou
// Perfil); "auto" segue o sistema e também é escolha do aluno.
export type Theme = 'auto' | 'light' | 'dark';
export type ReadingTone = 'normal' | 'sepia';

export interface Prefs {
  theme: Theme;
  sound: boolean;
  motion: boolean;
  focusQuiet: boolean; // no modo foco, desliga som e animações
  readingTone: ReadingTone;
}

export const DEFAULT_PREFS: Prefs = { theme: 'light', sound: true, motion: true, focusQuiet: true, readingTone: 'normal' };

const KEY = 'aprova-tico:prefs';

function load(): Prefs {
  let raw: unknown = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return { ...DEFAULT_PREFS };
  }
  const p = { ...DEFAULT_PREFS };
  if (!raw || typeof raw !== 'object') return p;
  const r = raw as Record<string, unknown>;
  if (r.theme === 'auto' || r.theme === 'light' || r.theme === 'dark') p.theme = r.theme;
  if (typeof r.sound === 'boolean') p.sound = r.sound;
  if (typeof r.motion === 'boolean') p.motion = r.motion;
  if (typeof r.focusQuiet === 'boolean') p.focusQuiet = r.focusQuiet;
  if (r.readingTone === 'normal' || r.readingTone === 'sepia') p.readingTone = r.readingTone;
  return p;
}

let prefs: Prefs = load();
let focus = false;
let version = 0;
const listeners = new Set<() => void>();

const media = (q: string) => (typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia(q) : null);
const darkQuery = () => media('(prefers-color-scheme: dark)');
const reducedQuery = () => media('(prefers-reduced-motion: reduce)');

export function resolvedTheme(): 'light' | 'dark' {
  if (prefs.theme !== 'auto') return prefs.theme;
  return darkQuery()?.matches ? 'dark' : 'light';
}

const quiet = () => focus && prefs.focusQuiet;
export const soundOn = () => prefs.sound && !quiet();
// Animações feitas por código (confete etc.) também respeitam o pedido do
// sistema de reduzir movimento. As de CSS respeitam pela media query.
export const motionOn = () => prefs.motion && !quiet() && !reducedQuery()?.matches;
export const getPrefs = (): Prefs => prefs;
export const isFocus = () => focus;

function apply() {
  if (typeof document === 'undefined') return;
  const d = document.documentElement.dataset;
  d.theme = resolvedTheme();
  d.motion = prefs.motion && !quiet() ? 'on' : 'off';
  if (focus) d.focus = 'on';
  else delete d.focus;
  if (prefs.readingTone === 'sepia') d.reading = 'sepia';
  else delete d.reading;
}

function changed() {
  version++;
  apply();
  for (const l of listeners) l();
}

export function setPrefs(patch: Partial<Prefs>): void {
  prefs = { ...prefs, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // sem armazenamento: vale só até fechar a página
  }
  changed();
}

export function setFocus(on: boolean): void {
  if (focus === on) return;
  focus = on;
  changed();
}

// Tema automático: acompanha a troca de claro/escuro do sistema.
darkQuery()?.addEventListener?.('change', () => {
  if (prefs.theme === 'auto') changed();
});
apply();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Nas telas: re-renderiza quando algo muda.
export function usePrefs(): { prefs: Prefs; focus: boolean } {
  useSyncExternalStore(subscribe, () => version, () => version);
  return { prefs, focus };
}

export function resetPrefsForTests(): void {
  prefs = load();
  focus = false;
  changed();
}
