// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetPrefsForTests, setFocus, setPrefs } from '../../src/lib/prefs';
import { play, resetSoundForTests } from '../../src/lib/sound';

let oscillators = 0;
class FakeAudio {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn(async () => {});
  createOscillator() { oscillators++; return { type: '', frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
}

beforeEach(() => {
  localStorage.clear();
  resetPrefsForTests();
  resetSoundForTests();
  oscillators = 0;
  vi.stubGlobal('AudioContext', FakeAudio);
});
afterEach(() => vi.unstubAllGlobals());

describe('sons', () => {
  it('toca com o som ligado', () => {
    play('acerto');
    expect(oscillators).toBe(2);
    play('fase');
    expect(oscillators).toBe(6);
  });

  it('som desligado ou modo foco silencioso: não toca', () => {
    setPrefs({ sound: false });
    play('acerto');
    setPrefs({ sound: true });
    setFocus(true);
    play('erro');
    expect(oscillators).toBe(0);
  });

  it('navegador sem áudio: não quebra', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => play('acerto')).not.toThrow();
  });
});
