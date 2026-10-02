// Sons curtos gerados no navegador (Web Audio): sem arquivos de áudio e sem
// direitos de terceiros. Só tocam se o aluno deixou os sons ligados (e fora
// do modo foco silencioso). Navegador sem áudio: não faz nada.

import { soundOn } from './prefs';

export type SoundName = 'acerto' | 'erro' | 'fase' | 'fim';

// Notas: [frequência em Hz, início em s, duração em s].
const TUNES: Record<SoundName, { wave: OscillatorType; notes: [number, number, number][]; volume: number }> = {
  acerto: { wave: 'sine', volume: 0.08, notes: [[660, 0, 0.12], [990, 0.09, 0.18]] },
  erro: { wave: 'triangle', volume: 0.07, notes: [[220, 0, 0.16], [165, 0.12, 0.22]] },
  fase: { wave: 'sine', volume: 0.08, notes: [[523, 0, 0.14], [659, 0.12, 0.14], [784, 0.24, 0.14], [1047, 0.36, 0.3]] },
  fim: { wave: 'sine', volume: 0.07, notes: [[587, 0, 0.14], [784, 0.12, 0.24]] },
};

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

export function play(name: SoundName): void {
  if (!soundOn()) return;
  const ac = audio();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') void ac.resume();
    const tune = TUNES[name];
    const t0 = ac.currentTime;
    for (const [freq, start, dur] of tune.notes) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = tune.wave;
      osc.frequency.setValueAtTime(freq, t0 + start);
      gain.gain.setValueAtTime(tune.volume, t0 + start);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.02);
    }
  } catch {
    // política de áudio do navegador: segue sem som
  }
}

export function resetSoundForTests(): void {
  ctx = null;
}
