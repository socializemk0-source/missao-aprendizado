// @vitest-environment jsdom
// Preferências do aluno (tema, som, animações, modo foco): ficam no aparelho
// e são aplicadas na página por atributos no <html>.
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS, getPrefs, isFocus, motionOn, resetPrefsForTests, setFocus, setPrefs, soundOn } from '../../src/lib/prefs';
import { me, renderAt, session } from './render';

const html = () => document.documentElement.dataset;

beforeEach(() => {
  localStorage.clear();
  resetPrefsForTests();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('preferências', () => {
  it('padrão: tema claro (o escuro só liga quando o aluno escolhe), som e animações ligados', () => {
    expect(getPrefs()).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS).toMatchObject({ theme: 'light', sound: true, motion: true, focusQuiet: true });
    expect(html().theme).toBe('light');
    expect(html().motion).toBe('on');
  });

  it('sistema no escuro não liga o tema escuro sozinho; só com "Automático"', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('dark'), addEventListener() {} }));
    resetPrefsForTests();
    expect(html().theme).toBe('light');
    setPrefs({ theme: 'auto' });
    expect(html().theme).toBe('dark');
    vi.unstubAllGlobals();
  });

  it('muda, aplica no <html> e guarda no aparelho', () => {
    setPrefs({ theme: 'dark', sound: false });
    expect(html().theme).toBe('dark');
    expect(soundOn()).toBe(false);
    expect(JSON.parse(localStorage.getItem('aprova-tico:prefs')!)).toMatchObject({ theme: 'dark', sound: false });
    resetPrefsForTests();
    expect(getPrefs().theme).toBe('dark'); // lido de novo do armazenamento
  });

  it('armazenamento bloqueado (aba anônima) não quebra: usa o padrão e segue funcionando', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    resetPrefsForTests();
    expect(getPrefs()).toEqual(DEFAULT_PREFS);
    setPrefs({ theme: 'dark' });
    expect(html().theme).toBe('dark');
  });

  it('valor estranho guardado é ignorado', () => {
    localStorage.setItem('aprova-tico:prefs', JSON.stringify({ theme: 'roxo', sound: 'sim', motion: false }));
    resetPrefsForTests();
    expect(getPrefs()).toEqual({ ...DEFAULT_PREFS, motion: false });
  });

  it('modo foco: por padrão desliga som e animações; dá para manter ligados', () => {
    setFocus(true);
    expect(isFocus()).toBe(true);
    expect(html().focus).toBe('on');
    expect(soundOn()).toBe(false);
    expect(motionOn()).toBe(false);
    expect(html().motion).toBe('off');
    setPrefs({ focusQuiet: false });
    expect(soundOn()).toBe(true);
    expect(motionOn()).toBe(true);
    setFocus(false);
    expect(html().focus).toBeUndefined();
  });
});

describe('tela de perfil: Aparência e som', () => {
  it('escolher tema escuro e desligar sons muda na hora', async () => {
    const user = userEvent.setup();
    renderAt('/perfil', { status: 'signedIn', session, me });
    await user.click(screen.getByRole('radio', { name: 'Escuro' }));
    expect(html().theme).toBe('dark');
    const sons = screen.getByRole('checkbox', { name: 'Sons de acerto e erro' });
    expect(sons).toBeChecked();
    await user.click(sons);
    expect(getPrefs().sound).toBe(false);
    await user.click(screen.getByRole('checkbox', { name: 'Animações' }));
    expect(html().motion).toBe('off');
    expect(screen.getByRole('checkbox', { name: 'No modo foco, desligar sons e animações' })).toBeChecked();
  });
});
