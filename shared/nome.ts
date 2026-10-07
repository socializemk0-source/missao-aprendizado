// Nome do aluno: aparece para outros alunos (ranking), então só aceita
// letras, números, espaço e . ' ’ - _ ( ) — nada de sinais de HTML.

export const NOME_MAX = 60;
const CARACTERES_DO_NOME = String.raw`\p{L}\p{M}\p{N} .'’_()\-`;
export const NOME_VALIDO = new RegExp(`^[${CARACTERES_DO_NOME}]+$`, 'u');
const FORA_DO_NOME = new RegExp(`[^${CARACTERES_DO_NOME}]`, 'gu');

// Tira do texto o que não pode estar num nome (para nomes vindos de fora,
// como o do Google, e para nomes antigos gravados antes da regra).
export function limparNome(texto: string): string {
  return texto.replace(FORA_DO_NOME, '').replace(/ {2,}/g, ' ').trim().slice(0, NOME_MAX).trim();
}
