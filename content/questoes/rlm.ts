import type { Questao } from '../types.js';

const CE = ['Certo', 'Errado'];
const autoral = { tipo: 'autoral' } as const;
const estiloCebraspe = { tipo: 'autoral', estilo: 'Cebraspe' } as const;

export const RLM: Questao[] = [
  // ---- Porcentagem ----
  {
    id: 'rlm-porc-1', disciplina: 'rlm', assunto: 'Porcentagem',
    enunciado: 'Um produto de R$ 200,00 teve desconto de 15%. Qual é o preço final?',
    alternativas: ['R$ 170,00', 'R$ 185,00', 'R$ 175,00', 'R$ 30,00'],
    correta: 0, dificuldade: 1,
    explicacao: '15% de 200 = 0,15 × 200 = 30. Preço final: 200 − 30 = R$ 170,00. Atalho: 200 × 0,85 = 170.',
    fonte: autoral,
  },
  {
    id: 'rlm-porc-2', disciplina: 'rlm', assunto: 'Porcentagem',
    enunciado: 'Um salário de R$ 2.000,00 teve um aumento de 10% e, depois, outro aumento de 10%. O salário final é:',
    alternativas: ['R$ 2.400,00', 'R$ 2.420,00', 'R$ 2.200,00', 'R$ 2.410,00'],
    correta: 1, dificuldade: 2,
    explicacao: 'Aumentos sucessivos se multiplicam: 2.000 × 1,10 = 2.200; 2.200 × 1,10 = 2.420. Não é 20% de uma vez.',
    fonte: autoral,
  },
  {
    id: 'rlm-porc-3', disciplina: 'rlm', assunto: 'Porcentagem',
    enunciado: 'Um aumento de 20% seguido de um desconto de 20% faz o preço voltar ao valor inicial.',
    alternativas: CE, correta: 1, dificuldade: 2,
    explicacao: 'Errado. 1,20 × 0,80 = 0,96: o preço final fica 4% menor que o inicial.',
    fonte: estiloCebraspe,
  },
  {
    id: 'rlm-porc-4', disciplina: 'rlm', assunto: 'Porcentagem',
    enunciado: 'Em uma turma de 40 alunos, 25% foram aprovados. Quantos foram reprovados?',
    alternativas: ['10', '25', '30', '15'],
    correta: 2, dificuldade: 1,
    explicacao: '25% de 40 = 10 aprovados. Reprovados: 40 − 10 = 30 (ou 75% de 40).',
    fonte: autoral,
  },
  // ---- Razão, proporção e regra de três ----
  {
    id: 'rlm-prop-1', disciplina: 'rlm', assunto: 'Regra de três',
    enunciado: 'Se 3 impressoras imprimem 600 páginas em 1 hora, quantas páginas 5 impressoras iguais imprimem no mesmo tempo?',
    alternativas: ['1.000', '900', '1.200', '800'],
    correta: 0, dificuldade: 1,
    explicacao: 'Mais impressoras, mais páginas (diretamente proporcional): cada uma imprime 200 páginas; 5 × 200 = 1.000.',
    fonte: autoral,
  },
  {
    id: 'rlm-prop-2', disciplina: 'rlm', assunto: 'Regra de três',
    enunciado: 'Se 4 servidores concluem um trabalho em 6 dias, em quantos dias 8 servidores, no mesmo ritmo, concluem o mesmo trabalho?',
    alternativas: ['12', '3', '4', '2'],
    correta: 1, dificuldade: 2,
    explicacao: 'Mais servidores, menos dias (inversamente proporcional): 4 × 6 = 8 × d, logo d = 3.',
    fonte: autoral,
  },
  {
    id: 'rlm-prop-3', disciplina: 'rlm', assunto: 'Razão e proporção',
    enunciado: 'A razão entre o número de homens e o de mulheres em uma sala é 2/3. Se há 30 pessoas na sala, quantas são mulheres?',
    alternativas: ['12', '18', '20', '10'],
    correta: 1, dificuldade: 2,
    explicacao: 'São 2 + 3 = 5 partes. 30 ÷ 5 = 6 pessoas por parte. Mulheres: 3 × 6 = 18.',
    fonte: autoral,
  },
  {
    id: 'rlm-prop-4', disciplina: 'rlm', assunto: 'Razão e proporção',
    enunciado: 'Se x/4 = 9/12, então x = 3.',
    alternativas: CE, correta: 0, dificuldade: 1,
    explicacao: 'Certo. 9/12 simplifica para 3/4. Se x/4 = 3/4, então x = 3.',
    fonte: estiloCebraspe,
  },
  // ---- Negação e conectivos ----
  {
    id: 'rlm-log-1', disciplina: 'rlm', assunto: 'Negação de proposições',
    enunciado: 'A negação de "Todos os candidatos estudaram" é:',
    alternativas: ['Nenhum candidato estudou.', 'Algum candidato não estudou.', 'Todos os candidatos não estudaram.', 'Algum candidato estudou.'],
    correta: 1, dificuldade: 2,
    explicacao: 'Para negar "todos", basta um contraexemplo: "Algum (pelo menos um) candidato não estudou".',
    fonte: autoral,
  },
  {
    id: 'rlm-log-2', disciplina: 'rlm', assunto: 'Negação de proposições',
    enunciado: 'A negação de "Pedro é servidor e Maria é advogada" é:',
    alternativas: ['Pedro não é servidor e Maria não é advogada.', 'Pedro não é servidor ou Maria não é advogada.', 'Pedro é servidor ou Maria é advogada.', 'Se Pedro é servidor, então Maria não é advogada.'],
    correta: 1, dificuldade: 3,
    explicacao: 'Lei de De Morgan: ~(p ∧ q) ≡ ~p ∨ ~q. Nega-se cada parte e troca-se "e" por "ou".',
    fonte: autoral,
  },
  {
    id: 'rlm-log-3', disciplina: 'rlm', assunto: 'Condicional',
    enunciado: 'A proposição "Se chove, então a rua fica molhada" só é falsa quando chove e a rua não fica molhada.',
    alternativas: CE, correta: 0, dificuldade: 2,
    explicacao: 'Certo. A condicional p → q só é falsa quando p é verdadeira e q é falsa (V → F = F).',
    fonte: estiloCebraspe,
  },
  {
    id: 'rlm-log-4', disciplina: 'rlm', assunto: 'Conectivos',
    enunciado: 'Sabendo que p é verdadeira e q é falsa, qual proposição é verdadeira?',
    alternativas: ['p ∧ q', 'p → q', 'p ∨ q', '~p'],
    correta: 2, dificuldade: 2,
    explicacao: 'A disjunção "ou" é verdadeira se pelo menos uma parte for verdadeira: V ∨ F = V. Já V ∧ F = F, V → F = F e ~V = F.',
    fonte: autoral,
  },
  // ---- Equivalências ----
  {
    id: 'rlm-eq-1', disciplina: 'rlm', assunto: 'Equivalências lógicas',
    enunciado: '"Se estudo, então passo" é equivalente a:',
    alternativas: ['Se passo, então estudo.', 'Se não estudo, então não passo.', 'Se não passo, então não estudo.', 'Estudo e passo.'],
    correta: 2, dificuldade: 3,
    explicacao: 'Contrapositiva: p → q ≡ ~q → ~p. Inverte-se a ordem e nega-se as duas partes.',
    fonte: autoral,
  },
  {
    id: 'rlm-eq-2', disciplina: 'rlm', assunto: 'Equivalências lógicas',
    enunciado: '"Se João é aprovado, então ele comemora" equivale a "João não é aprovado ou ele comemora".',
    alternativas: CE, correta: 0, dificuldade: 3,
    explicacao: 'Certo. p → q ≡ ~p ∨ q: nega-se a primeira parte, mantém-se a segunda e troca-se "se... então" por "ou".',
    fonte: estiloCebraspe,
  },
  {
    id: 'rlm-eq-3', disciplina: 'rlm', assunto: 'Negação de proposições',
    enunciado: 'A negação de "Se chove, então levo guarda-chuva" é:',
    alternativas: ['Se não chove, não levo guarda-chuva.', 'Chove e não levo guarda-chuva.', 'Não chove e levo guarda-chuva.', 'Não chove ou não levo guarda-chuva.'],
    correta: 1, dificuldade: 3,
    explicacao: '~(p → q) ≡ p ∧ ~q: mantém-se a primeira parte, nega-se a segunda e usa-se "e".',
    fonte: autoral,
  },
  {
    id: 'rlm-eq-4', disciplina: 'rlm', assunto: 'Tabela-verdade',
    enunciado: 'Quantas linhas tem a tabela-verdade de uma proposição composta por 3 proposições simples?',
    alternativas: ['6', '8', '9', '3'],
    correta: 1, dificuldade: 2,
    explicacao: 'O número de linhas é 2ⁿ, em que n é o número de proposições simples: 2³ = 8.',
    fonte: autoral,
  },
];
