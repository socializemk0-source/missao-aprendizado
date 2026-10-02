// Geradores de grade dos jogos: caça-palavras e cruzadinha. Funções puras;
// o sorteio vem de fora (Math.random em produção, semente fixa nos testes).

export type Sorteio = () => number;

// Sorteio com semente (mulberry32): mesmo número, mesma sequência.
export function sementeAleatoria(seed: number): Sorteio {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function embaralhar<T>(lista: readonly T[], random: Sorteio): T[] {
  const out = [...lista];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// ---------------------------------------------------------------- Caça-palavras
export interface Colocada { palavra: string; linha: number; coluna: number; dl: number; dc: number }

// Direções fáceis de ler no celular: → ↓ ↘.
const DIRECOES: [number, number][] = [[0, 1], [1, 0], [1, 1]];
const ALFABETO = 'ABCDEFGHIJLMNOPQRSTUVXZ'; // letras comuns em português

export function gerarCaca(palavras: string[], tamanho: number, random: Sorteio): { grade: string[]; colocadas: Colocada[] } | null {
  if (palavras.some((p) => p.length > tamanho)) return null;
  const ordem = [...palavras].sort((a, b) => b.length - a.length);
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const grade: (string | null)[][] = Array.from({ length: tamanho }, () => Array<string | null>(tamanho).fill(null));
    const colocadas: Colocada[] = [];
    let ok = true;
    for (const palavra of ordem) {
      let posta = false;
      for (let k = 0; k < 200 && !posta; k++) {
        const [dl, dc] = DIRECOES[Math.floor(random() * DIRECOES.length)]!;
        const maxL = tamanho - (dl ? palavra.length : 1);
        const maxC = tamanho - (dc ? palavra.length : 1);
        const linha = Math.floor(random() * (maxL + 1));
        const coluna = Math.floor(random() * (maxC + 1));
        const cabe = [...palavra].every((letra, i) => {
          const atual = grade[linha + dl * i]![coluna + dc * i];
          return atual === null || atual === letra;
        });
        if (!cabe) continue;
        [...palavra].forEach((letra, i) => { grade[linha + dl * i]![coluna + dc * i] = letra; });
        colocadas.push({ palavra, linha, coluna, dl, dc });
        posta = true;
      }
      if (!posta) { ok = false; break; }
    }
    if (!ok) continue;
    const linhas = grade.map((l) => l.map((x) => x ?? ALFABETO[Math.floor(random() * ALFABETO.length)]!).join(''));
    // Ordem original das palavras (a da lista mostrada ao aluno).
    colocadas.sort((a, b) => palavras.indexOf(a.palavra) - palavras.indexOf(b.palavra));
    return { grade: linhas, colocadas };
  }
  return null;
}

// ---------------------------------------------------------------- Cruzadinha
export interface Entrada {
  n: number;
  direcao: 'H' | 'V';
  linha: number;
  coluna: number;
  resposta: string;
  dica: string;
}

interface Posta { resposta: string; dica: string; linha: number; coluna: number; direcao: 'H' | 'V' }

// Monta a cruzadinha colocando uma palavra por vez, sempre cruzando com as
// que já estão, sem encostar lado a lado. Tenta várias ordens e fica com a
// que coloca mais palavras dentro de max × max.
export function gerarCruzadinha(
  itens: { resposta: string; dica: string }[], random: Sorteio, opcoes: { max: number; alvo: number },
): { largura: number; altura: number; entradas: Entrada[] } | null {
  let melhor: Posta[] | null = null;
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const postas = montar(embaralhar(itens, random), random, opcoes);
    if (!melhor || postas.length > melhor.length) melhor = postas;
    if (melhor.length >= opcoes.alvo) break;
  }
  if (!melhor || melhor.length < Math.min(5, opcoes.alvo)) return null;
  return numerar(melhor);
}

function montar(itens: { resposta: string; dica: string }[], random: Sorteio, { max, alvo }: { max: number; alvo: number }): Posta[] {
  const cel = new Map<string, { letra: string; h: boolean; v: boolean }>();
  const k = (l: number, c: number) => `${l},${c}`;
  const postas: Posta[] = [];
  let [minL, maxL, minC, maxC] = [0, 0, 0, 0];

  const colocar = (p: Posta) => {
    for (let i = 0; i < p.resposta.length; i++) {
      const l = p.linha + (p.direcao === 'V' ? i : 0);
      const c = p.coluna + (p.direcao === 'H' ? i : 0);
      const atual = cel.get(k(l, c)) ?? { letra: p.resposta[i]!, h: false, v: false };
      if (p.direcao === 'H') atual.h = true; else atual.v = true;
      cel.set(k(l, c), atual);
      minL = Math.min(minL, l); maxL = Math.max(maxL, l); minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    }
    postas.push(p);
  };

  // Quantos cruzamentos a palavra faz ali (-1 = não pode).
  const avaliar = (resposta: string, linha: number, coluna: number, direcao: 'H' | 'V'): number => {
    const [dl, dc] = direcao === 'H' ? [0, 1] : [1, 0];
    const antes = cel.get(k(linha - dl, coluna - dc));
    const depois = cel.get(k(linha + dl * resposta.length, coluna + dc * resposta.length));
    if (antes || depois) return -1;
    let cruzamentos = 0;
    let [l0, l1, c0, c1] = [minL, maxL, minC, maxC];
    for (let i = 0; i < resposta.length; i++) {
      const l = linha + dl * i;
      const c = coluna + dc * i;
      const atual = cel.get(k(l, c));
      if (atual) {
        if (atual.letra !== resposta[i] || (direcao === 'H' ? atual.h : atual.v)) return -1;
        cruzamentos++;
      } else {
        // Casa nova: os vizinhos do lado não podem ter letra (senão gruda).
        const lado1 = cel.get(k(l + dc, c + dl));
        const lado2 = cel.get(k(l - dc, c - dl));
        if (lado1 || lado2) return -1;
      }
      l0 = Math.min(l0, l); l1 = Math.max(l1, l); c0 = Math.min(c0, c); c1 = Math.max(c1, c);
    }
    if (l1 - l0 + 1 > max || c1 - c0 + 1 > max) return -1;
    return cruzamentos;
  };

  for (const item of itens) {
    if (postas.length >= alvo) break;
    if (item.resposta.length > max) continue;
    if (postas.length === 0) {
      colocar({ ...item, linha: 0, coluna: 0, direcao: random() < 0.5 ? 'H' : 'V' });
      continue;
    }
    const opcoes: { p: Posta; nota: number }[] = [];
    for (const [chave, casa] of cel) {
      const [l, c] = chave.split(',').map(Number) as [number, number];
      for (let i = 0; i < item.resposta.length; i++) {
        if (item.resposta[i] !== casa.letra) continue;
        for (const direcao of ['H', 'V'] as const) {
          const linha = direcao === 'V' ? l - i : l;
          const coluna = direcao === 'H' ? c - i : c;
          const nota = avaliar(item.resposta, linha, coluna, direcao);
          if (nota > 0) opcoes.push({ p: { ...item, linha, coluna, direcao }, nota });
        }
      }
    }
    if (opcoes.length === 0) continue;
    const topo = Math.max(...opcoes.map((o) => o.nota));
    const boas = opcoes.filter((o) => o.nota === topo);
    colocar(boas[Math.floor(random() * boas.length)]!.p);
  }
  return postas.map((p) => ({ ...p, linha: p.linha - minL, coluna: p.coluna - minC }));
}

function numerar(postas: Posta[]): { largura: number; altura: number; entradas: Entrada[] } {
  const altura = Math.max(...postas.map((p) => p.linha + (p.direcao === 'V' ? p.resposta.length : 1)));
  const largura = Math.max(...postas.map((p) => p.coluna + (p.direcao === 'H' ? p.resposta.length : 1)));
  const inicios = [...new Set(postas.map((p) => p.linha * 1000 + p.coluna))].sort((a, b) => a - b);
  const entradas = postas
    .map((p) => ({ n: inicios.indexOf(p.linha * 1000 + p.coluna) + 1, direcao: p.direcao, linha: p.linha, coluna: p.coluna, resposta: p.resposta, dica: p.dica }))
    .sort((a, b) => a.n - b.n || (a.direcao === 'H' ? -1 : 1));
  return { largura, altura, entradas };
}
