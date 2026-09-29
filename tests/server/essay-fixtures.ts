// Texto e relatório de exemplo para os testes de redação.
import type { EssayReport } from '../../shared/essay.js';

export const TEXT = [
  'A integração das forças de segurança é essencial para o país.',
  'Inicialmente, no tocante à cooperação, os estados precisam “compartilhar dados” em tempo real.',
  'Ademais, a tecnologia amplia o controle das fronteiras.',
].join('\n');

export function report(overrides: Partial<Record<keyof EssayReport, unknown>> = {}): EssayReport {
  return {
    summary: 'Texto claro, com bom atendimento aos tópicos.',
    criteria: [
      { id: 'tema', score: 16, reason: 'Atende ao tema.' },
      { id: 'argumentos', score: 22, reason: 'Argumentos consistentes.' },
      { id: 'organizacao', score: 15, reason: 'Boa coesão.' },
      { id: 'linguagem', score: 25, reason: 'Poucos desvios.' },
    ],
    annotations: [{ quote: 'a tecnologia amplia o controle das fronteiras', issue: 'Genérico.', suggestion: 'Cite uma ferramenta.' }],
    strengths: ['Conectivos claros.'],
    nextSteps: ['Traga dados concretos.'],
    ...overrides,
  } as EssayReport;
}
