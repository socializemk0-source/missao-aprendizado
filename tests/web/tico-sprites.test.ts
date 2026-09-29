// Tiras de quadros do Tico: o tamanho de cada arquivo precisa bater com o que
// o componente usa (largura do quadro x número de quadros), senão a animação
// "escorrega" e mostra pedaços do quadro vizinho.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TICO_ANIMS } from '../../src/components/TicoAnim';

// Lê largura e altura do cabeçalho de um .webp (VP8, VP8L ou VP8X).
function webpSize(buf: Buffer): { w: number; h: number } {
  expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
  expect(buf.toString('ascii', 8, 12)).toBe('WEBP');
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  if (kind === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
}

describe('tiras do Tico', () => {
  for (const [name, a] of Object.entries(TICO_ANIMS)) {
    it(`${name}: ${a.frames} quadros de ${a.w}x${a.h}`, () => {
      const size = webpSize(readFileSync(`public/tico/anim/${name}.webp`));
      expect(size).toEqual({ w: a.w * a.frames, h: a.h });
    });
  }
});
