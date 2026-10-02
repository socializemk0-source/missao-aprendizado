// Conteúdo dos jogos (content/jogos.ts): termos para memória, caça-palavras
// e cruzadinha; afirmações "certo ou errado" para o Radar do Tico.
// Tudo autoral. Estes testes impedem termo que não cabe na grade, dica que
// entrega a resposta, afirmação sem explicação etc.
import { describe, expect, it } from 'vitest';
import { AFIRMACOES, GLOSSARIO, letras } from '../../content/jogos.js';
import { DISCIPLINAS } from '../../content/trilha.js';

describe('glossário dos jogos', () => {
  it('termos: uma palavra, 4 a 12 letras, sem repetir na mesma matéria', () => {
    for (const t of GLOSSARIO) {
      expect(letras(t.termo), t.termo).toMatch(/^[A-Z]{4,12}$/);
      expect(t.termo, t.termo).toBe(t.termo.toUpperCase());
    }
    for (const d of DISCIPLINAS) {
      const nomes = GLOSSARIO.filter((t) => t.disciplina === d.id).map((t) => letras(t.termo));
      expect(new Set(nomes).size, d.id).toBe(nomes.length);
    }
  });

  it('toda matéria tem pelo menos 14 termos (dá para montar as grades com folga)', () => {
    for (const d of DISCIPLINAS) expect(GLOSSARIO.filter((t) => t.disciplina === d.id).length, d.id).toBeGreaterThanOrEqual(14);
  });

  it('a dica explica sem entregar o termo', () => {
    for (const t of GLOSSARIO) {
      const dica = letras(t.dica);
      expect(t.dica.length, t.termo).toBeGreaterThanOrEqual(15);
      expect(t.dica.length, t.termo).toBeLessThanOrEqual(90);
      // o termo (ou o começo dele) não aparece na dica
      expect(dica.includes(letras(t.termo).slice(0, 5)), `${t.termo}: ${t.dica}`).toBe(false);
    }
  });

  it('letras(): tira acento e cedilha e deixa só A–Z', () => {
    expect(letras('Próclise')).toBe('PROCLISE');
    expect(letras('AÇÃO')).toBe('ACAO');
    expect(letras('Mesóclise ')).toBe('MESOCLISE');
  });
});

describe('afirmações do Radar do Tico', () => {
  it('ids únicos; texto e explicação completos; a explicação começa pelo gabarito', () => {
    expect(new Set(AFIRMACOES.map((a) => a.id)).size).toBe(AFIRMACOES.length);
    for (const a of AFIRMACOES) {
      expect(a.texto.length, a.id).toBeGreaterThanOrEqual(25);
      expect(a.explicacao.length, a.id).toBeGreaterThanOrEqual(30);
      expect(a.explicacao.startsWith(a.certo ? 'Certo.' : 'Errado.'), a.id).toBe(true);
    }
  });

  it('toda matéria tem pelo menos 14 afirmações, com certas e erradas equilibradas', () => {
    for (const d of DISCIPLINAS) {
      const lista = AFIRMACOES.filter((a) => a.disciplina === d.id);
      expect(lista.length, d.id).toBeGreaterThanOrEqual(14);
      const certas = lista.filter((a) => a.certo).length / lista.length;
      expect(certas, d.id).toBeGreaterThanOrEqual(0.35);
      expect(certas, d.id).toBeLessThanOrEqual(0.65);
    }
  });
});
