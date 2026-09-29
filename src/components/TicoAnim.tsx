// Tico animado: tiras de quadros (public/tico/anim/*.webp) tocadas em CSS.
// Com animações desligadas (preferência, modo foco ou "reduzir movimento"
// do sistema), mostra só o primeiro quadro, parado.

import type { CSSProperties } from 'react';

export const TICO_ANIMS = {
  parado: { frames: 6, w: 68, h: 95, fps: 6 },
  acenar: { frames: 6, w: 90, h: 94, fps: 8 },
  palmas: { frames: 6, w: 85, h: 96, fps: 9 },
  rir: { frames: 6, w: 81, h: 93, fps: 8 },
  decepcionar: { frames: 6, w: 85, h: 93, fps: 6 },
  motivar: { frames: 6, w: 88, h: 96, fps: 7 },
  apontar: { frames: 6, w: 87, h: 95, fps: 7 },
  pular: { frames: 8, w: 105, h: 118, fps: 9 },
  correr: { frames: 6, w: 97, h: 91, fps: 12 },
  andar: { frames: 7, w: 77, h: 94, fps: 9 },
  voar: { frames: 6, w: 121, h: 108, fps: 8 },
  cair: { frames: 7, w: 119, h: 92, fps: 8 },
  dano: { frames: 3, w: 87, h: 102, fps: 6 },
  interagir: { frames: 4, w: 115, h: 103, fps: 6 },
} as const;

export type TicoAnimName = keyof typeof TICO_ANIMS;

const LABELS: Record<TicoAnimName, string> = {
  parado: 'Tico esperando', acenar: 'Tico acenando', palmas: 'Tico batendo palmas', rir: 'Tico rindo de alegria',
  decepcionar: 'Tico desapontado', motivar: 'Tico motivando você', apontar: 'Tico apontando', pular: 'Tico pulando de alegria',
  correr: 'Tico correndo', andar: 'Tico andando', voar: 'Tico voando', cair: 'Tico caído e tonto', dano: 'Tico levando um golpe',
  interagir: 'Tico usando o galho',
};

export function TicoAnim({ name, height = 96, className = '', label }: { name: TicoAnimName; height?: number; className?: string; label?: string }) {
  const a = TICO_ANIMS[name];
  const scale = height / a.h;
  const w = Math.round(a.w * scale);
  const style = {
    width: w,
    height,
    backgroundImage: `url(/tico/anim/${name}.webp)`,
    backgroundSize: `${w * a.frames}px ${height}px`,
    '--tico-end': `-${w * a.frames}px`,
    animationDuration: `${(a.frames / a.fps).toFixed(2)}s`,
    animationTimingFunction: `steps(${a.frames})`,
  } as CSSProperties;
  return <span role="img" aria-label={label ?? LABELS[name]} className={`tico-anim ${className}`} style={style} data-anim={name} />;
}
