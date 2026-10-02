// Geradores de grade dos jogos (server/grades.ts): caça-palavras e
// cruzadinha. Sorteio com semente fixa para o teste ser sempre igual.
import { describe, expect, it } from 'vitest';
import { gerarCaca, gerarCruzadinha, sementeAleatoria } from '../../server/grades.js';

const PALAVRAS = ['CRASE', 'SUJEITO', 'APOSTO', 'VOCATIVO', 'PREDICADO', 'OXITONA', 'METAFORA'];
const DIRECOES = ['0,1', '1,0', '1,1'];

describe('caça-palavras', () => {
  it('toda palavra está na grade, na posição e direção informadas; o resto é letra A–Z', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = gerarCaca(PALAVRAS, 10, sementeAleatoria(seed));
      expect(r, `semente ${seed}`).not.toBeNull();
      const { grade, colocadas } = r!;
      expect(grade).toHaveLength(10);
      for (const linha of grade) expect(linha).toMatch(/^[A-Z]{10}$/);
      expect(colocadas.map((c) => c.palavra).sort()).toEqual([...PALAVRAS].sort());
      for (const c of colocadas) {
        expect(DIRECOES).toContain(`${c.dl},${c.dc}`);
        const lida = [...c.palavra].map((_, i) => grade[c.linha + c.dl * i]![c.coluna + c.dc * i]).join('');
        expect(lida).toBe(c.palavra);
      }
    }
  });

  it('mesma semente, mesma grade; palavra maior que a grade não cabe', () => {
    expect(gerarCaca(PALAVRAS, 10, sementeAleatoria(7))).toEqual(gerarCaca(PALAVRAS, 10, sementeAleatoria(7)));
    expect(gerarCaca(['CRIPTOGRAFIA'], 10, sementeAleatoria(1))).toBeNull();
  });
});

// Remonta a grade a partir das entradas e confere as regras de uma cruzadinha.
function conferir(r: NonNullable<ReturnType<typeof gerarCruzadinha>>) {
  const cel = new Map<string, string>();
  for (const e of r.entradas) {
    for (let i = 0; i < e.resposta.length; i++) {
      const l = e.linha + (e.direcao === 'V' ? i : 0);
      const c = e.coluna + (e.direcao === 'H' ? i : 0);
      expect(l >= 0 && l < r.altura && c >= 0 && c < r.largura).toBe(true);
      const k = `${l},${c}`;
      if (cel.has(k)) expect(cel.get(k), `cruzamento em ${k}`).toBe(e.resposta[i]);
      cel.set(k, e.resposta[i]!);
    }
  }
  // Cada sequência de 2+ letras na horizontal ou vertical é exatamente uma entrada
  // (nada de palavras "grudadas" formando lixo).
  const at = (l: number, c: number) => cel.get(`${l},${c}`);
  const runs: string[] = [];
  for (let l = 0; l < r.altura; l++) for (let c = 0; c < r.largura; c++) {
    if (at(l, c) && !at(l, c - 1) && at(l, c + 1)) { let s = ''; for (let k = c; at(l, k); k++) s += at(l, k); runs.push(`H${l},${c}:${s}`); }
    if (at(l, c) && !at(l - 1, c) && at(l + 1, c)) { let s = ''; for (let k = l; at(k, c); k++) s += at(k, c); runs.push(`V${l},${c}:${s}`); }
  }
  expect(runs.sort()).toEqual(r.entradas.map((e) => `${e.direcao}${e.linha},${e.coluna}:${e.resposta}`).sort());
  // Tudo ligado: dá para ir de qualquer letra a qualquer outra.
  const todas = [...cel.keys()];
  const vistas = new Set([todas[0]!]);
  const fila = [todas[0]!];
  while (fila.length) {
    const [l, c] = fila.shift()!.split(',').map(Number) as [number, number];
    for (const [a, b] of [[l + 1, c], [l - 1, c], [l, c + 1], [l, c - 1]]) {
      const k = `${a},${b}`;
      if (cel.has(k) && !vistas.has(k)) { vistas.add(k); fila.push(k); }
    }
  }
  expect(vistas.size).toBe(todas.length);
  // Numeração na ordem de leitura; H e V que começam na mesma casa dividem o número.
  const inicio = (e: (typeof r.entradas)[number]) => e.linha * 100 + e.coluna;
  const ordenadas = [...r.entradas].sort((a, b) => inicio(a) - inicio(b));
  let ultimo = 0; let ultimaCasa = -1;
  for (const e of ordenadas) {
    if (inicio(e) === ultimaCasa) expect(e.n).toBe(ultimo);
    else { expect(e.n).toBe(ultimo + 1); ultimo = e.n; ultimaCasa = inicio(e); }
  }
}

describe('cruzadinha', () => {
  const itens = PALAVRAS.map((resposta) => ({ resposta, dica: `Dica de ${resposta.length} letras.` }));

  it('palavras se cruzam certo, sem grudar, tudo ligado, numeração na ordem de leitura', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = gerarCruzadinha(itens, sementeAleatoria(seed), { max: 12, alvo: 6 });
      expect(r, `semente ${seed}`).not.toBeNull();
      expect(r!.entradas.length).toBeGreaterThanOrEqual(5);
      expect(r!.largura).toBeLessThanOrEqual(12);
      expect(r!.altura).toBeLessThanOrEqual(12);
      expect(r!.entradas.some((e) => e.direcao === 'H')).toBe(true);
      expect(r!.entradas.some((e) => e.direcao === 'V')).toBe(true);
      conferir(r!);
    }
  });

  it('a dica acompanha a palavra certa', () => {
    const r = gerarCruzadinha(itens, sementeAleatoria(3), { max: 12, alvo: 6 })!;
    for (const e of r.entradas) expect(e.dica).toBe(`Dica de ${e.resposta.length} letras.`);
  });
});
