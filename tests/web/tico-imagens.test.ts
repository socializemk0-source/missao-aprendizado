// Tico em imagem fixa e leve: nada de animação por quadros (fica para um
// artista depois que o produto for validado) e cada pose pesa pouco, para o
// app abrir rápido no celular.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const POSES = ['neutro', 'acenando', 'comemorando', 'apontando', 'joinha', 'estrela'];

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe('imagens do Tico', () => {
  it('cada pose existe em WebP e pesa menos de 60 KB', () => {
    for (const pose of POSES) {
      const file = `public/tico/${pose}.webp`;
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file).toString('ascii', 8, 12)).toBe('WEBP');
      expect(statSync(file).size).toBeLessThan(60 * 1024);
    }
  });

  it('o componente usa as imagens leves', () => {
    expect(readFileSync('src/components/Tico.tsx', 'utf8')).toContain('/tico/${pose}.webp');
  });

  it('sem animação por quadros: nem tiras, nem componente, nem uso nas telas', () => {
    expect(existsSync('public/tico/anim')).toBe(false);
    expect(existsSync('src/components/TicoAnim.tsx')).toBe(false);
    const code = filesUnder('src').filter((f) => /\.(tsx?|css)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(code).not.toMatch(/TicoAnim|tico-anim|tico\/anim/);
  });
});
