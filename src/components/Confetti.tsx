// Confete de comemoração (fase concluída, sessão perfeita). Só aparece com
// animações ligadas; é enfeite, escondido de leitores de tela.

import type { CSSProperties } from 'react';
import { motionOn } from '../lib/prefs';

const COLORS = ['#72c93d', '#1688e8', '#f5b700', '#f7931e', '#e11d48', '#7c3aed'];

export function Confetti({ pieces = 28 }: { pieces?: number }) {
  if (!motionOn()) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: pieces }, (_, i) => (
        <i
          key={i}
          style={{
            '--x': `${(i * 37) % 100}%`,
            '--d': `${((i * 53) % 90) / 100}s`,
            '--r': `${(i * 71) % 360}deg`,
            '--c': COLORS[i % COLORS.length],
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
