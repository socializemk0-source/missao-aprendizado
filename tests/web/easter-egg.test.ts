import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TICO_ASCII, mostrarTicoNoConsole, resetEasterEggForTests } from '../../src/lib/easter-egg';

beforeEach(() => resetEasterEggForTests());

describe('easter egg do Tico no console', () => {
  it('desenha o Tico e deixa um recado para quem abriu o F12', () => {
    const log = vi.fn();
    mostrarTicoNoConsole({ log });
    const texto = log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(texto).toContain(TICO_ASCII);
    expect(texto).toMatch(/Tico/);
    expect(texto).toMatch(/bastidores/i);
  });

  it('o desenho tem todas as linhas do Tico', () => {
    expect(TICO_ASCII.split('\n')).toHaveLength(27);
  });

  it('só aparece uma vez, mesmo se chamado de novo', () => {
    const log = vi.fn();
    mostrarTicoNoConsole({ log });
    const chamadas = log.mock.calls.length;
    expect(chamadas).toBeGreaterThan(0);
    mostrarTicoNoConsole({ log });
    expect(log.mock.calls.length).toBe(chamadas);
  });

  it('não quebra o app se o console falhar', () => {
    expect(() => mostrarTicoNoConsole({ log: () => { throw new Error('sem console'); } })).not.toThrow();
  });
});
