// Contraste das cores de texto do tema claro (WCAG AA: 4,5 para texto
// normal), sobre o fundo da página e sobre o branco dos cartões. O PageSpeed
// (acessibilidade) aponta quando alguma fica abaixo.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/global.css', 'utf8');
const root = /:root\s*\{([\s\S]*?)\}/.exec(css)![1]!;
const cor = (nome: string) => new RegExp(`--${nome}:\\s*(#[0-9a-f]{6})`, 'i').exec(root)![1]!;

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
};

describe('contraste do texto (tema claro)', () => {
  it.each(['fg', 'muted-fg', 'subtle', 'primary-strong'])('--%s tem contraste 4,5 no fundo e no branco', (nome) => {
    for (const fundo of [cor('bg'), '#ffffff']) expect(contraste(cor(nome), fundo), `${nome} em ${fundo}`).toBeGreaterThanOrEqual(4.5);
  });
});
