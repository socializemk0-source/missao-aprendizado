import type { Questao } from '../types.js';

const CE = ['Certo', 'Errado'];
const autoral = { tipo: 'autoral' } as const;
const estiloCebraspe = { tipo: 'autoral', estilo: 'Cebraspe' } as const;

export const PORTUGUES: Questao[] = [
  // ---- Acentuação ----
  {
    id: 'pt-acent-1', disciplina: 'portugues', assunto: 'Acentuação gráfica',
    enunciado: 'Assinale a alternativa em que todas as palavras estão acentuadas de acordo com o Acordo Ortográfico em vigor.',
    alternativas: ['herói, ideia, vôo', 'idéia, herói, papéis', 'herói, ideia, papéis', 'heroi, ideia, papeis'],
    correta: 2, dificuldade: 2,
    explicacao: 'Os ditongos abertos "éi" e "ói" perderam o acento nas paroxítonas (ideia, heroico), mas continuam acentuados nas oxítonas (herói, papéis). "Voo" também perdeu o acento.',
    fonte: autoral,
  },
  {
    id: 'pt-acent-2', disciplina: 'portugues', assunto: 'Acentuação gráfica',
    enunciado: 'Pelo Acordo Ortográfico em vigor, a palavra "enjoo" não recebe mais acento circunflexo.',
    alternativas: CE, correta: 0, dificuldade: 2,
    explicacao: 'Certo. Os hiatos "oo" e "ee" deixaram de ser acentuados: enjoo, voo, leem, creem, veem.',
    fonte: estiloCebraspe,
  },
  {
    id: 'pt-acent-3', disciplina: 'portugues', assunto: 'Acentuação gráfica',
    enunciado: 'A palavra "fácil" recebe acento gráfico porque é:',
    alternativas: ['oxítona terminada em "l"', 'paroxítona terminada em "l"', 'proparoxítona', 'monossílaba tônica'],
    correta: 1, dificuldade: 1,
    explicacao: 'Em "fá-cil" a sílaba tônica é a penúltima (paroxítona). Paroxítonas terminadas em "l", "n", "r", "x" e "ps" são acentuadas: fácil, hífen, caráter, tórax, bíceps.',
    fonte: autoral,
  },
  {
    id: 'pt-acent-4', disciplina: 'portugues', assunto: 'Acentuação gráfica',
    enunciado: 'Qual das palavras abaixo é proparoxítona?',
    alternativas: ['ínterim', 'rubrica', 'recorde', 'gratuito'],
    correta: 0, dificuldade: 3,
    explicacao: '"Ín-te-rim" tem a sílaba tônica na antepenúltima: é proparoxítona, e toda proparoxítona é acentuada. As outras são paroxítonas: ru-BRI-ca, re-COR-de, gra-TUI-to.',
    fonte: autoral,
  },
  // ---- Crase ----
  {
    id: 'pt-crase-1', disciplina: 'portugues', assunto: 'Crase',
    enunciado: 'Assinale a frase em que o acento grave (crase) está empregado corretamente.',
    alternativas: ['Fui à Brasília ontem.', 'Entreguei o documento à ela.', 'Refiro-me à diretora do setor.', 'Começou à chover.'],
    correta: 2, dificuldade: 2,
    explicacao: '"Referir-se a" + "a diretora" = "à diretora". Não há crase antes de "Brasília" (vou a Brasília, volto de Brasília), antes de pronome pessoal ("a ela") nem antes de verbo ("a chover").',
    fonte: autoral,
  },
  {
    id: 'pt-crase-2', disciplina: 'portugues', assunto: 'Crase',
    enunciado: 'Na frase "Ele saiu à francesa", o acento grave é obrigatório, pois a expressão equivale a "à moda francesa".',
    alternativas: CE, correta: 0, dificuldade: 2,
    explicacao: 'Certo. Na expressão "à moda de" (mesmo que "moda" fique subentendida), usa-se crase: saiu à francesa, bife à milanesa.',
    fonte: estiloCebraspe,
  },
  {
    id: 'pt-crase-3', disciplina: 'portugues', assunto: 'Crase',
    enunciado: 'Complete corretamente: "O servidor dirigiu-se ___ sala do chefe e depois ___ uma reunião."',
    alternativas: ['à — a', 'a — à', 'à — à', 'a — a'],
    correta: 0, dificuldade: 2,
    explicacao: '"Dirigir-se a" + "a sala" = "à sala". Antes do artigo indefinido "uma" não há crase: "a uma reunião".',
    fonte: autoral,
  },
  {
    id: 'pt-crase-4', disciplina: 'portugues', assunto: 'Crase',
    enunciado: 'Em qual frase o "a" NÃO deve receber acento grave?',
    alternativas: ['Voltei a pé para casa.', 'Assisti à palestra.', 'Obedeça às normas.', 'Estava à procura de emprego.'],
    correta: 0, dificuldade: 1,
    explicacao: '"Pé" é palavra masculina: não há artigo "a", logo não há crase. Nas outras, a preposição exigida pelo verbo ou pela locução se junta ao artigo "a".',
    fonte: autoral,
  },
  // ---- Concordância verbal ----
  {
    id: 'pt-conc-1', disciplina: 'portugues', assunto: 'Concordância verbal',
    enunciado: 'Assinale a frase correta quanto à concordância verbal.',
    alternativas: ['Fazem dois anos que estudo para concursos.', 'Houveram muitos candidatos aprovados.', 'Faz dois anos que estudo para concursos.', 'Existe várias vagas abertas.'],
    correta: 2, dificuldade: 2,
    explicacao: '"Fazer" indicando tempo decorrido é impessoal e fica no singular: "Faz dois anos". "Haver" no sentido de existir também: "Houve muitos candidatos". Já "existir" é pessoal: "Existem várias vagas".',
    fonte: autoral,
  },
  {
    id: 'pt-conc-2', disciplina: 'portugues', assunto: 'Concordância verbal',
    enunciado: 'Na frase "Vende-se casas", a concordância está de acordo com a norma-padrão.',
    alternativas: CE, correta: 1, dificuldade: 3,
    explicacao: 'Errado. O "se" é partícula apassivadora e "casas" é o sujeito: "Vendem-se casas" (= casas são vendidas).',
    fonte: estiloCebraspe,
  },
  {
    id: 'pt-conc-3', disciplina: 'portugues', assunto: 'Concordância verbal',
    enunciado: 'Complete: "Mais de um candidato ___ a prova ontem."',
    alternativas: ['fizeram', 'fez', 'fazem', 'faziam'],
    correta: 1, dificuldade: 2,
    explicacao: 'Com a expressão "mais de um", o verbo fica, em regra, no singular: "Mais de um candidato fez a prova".',
    fonte: autoral,
  },
  {
    id: 'pt-conc-4', disciplina: 'portugues', assunto: 'Concordância verbal',
    enunciado: 'Em "Precisa-se de professores", o verbo fica no singular porque o "se" é índice de indeterminação do sujeito.',
    alternativas: CE, correta: 0, dificuldade: 3,
    explicacao: 'Certo. "Precisar de" é transitivo indireto; com "se", o sujeito fica indeterminado e o verbo permanece no singular.',
    fonte: estiloCebraspe,
  },
  // ---- Pontuação ----
  {
    id: 'pt-pont-1', disciplina: 'portugues', assunto: 'Pontuação',
    enunciado: 'Assinale a frase pontuada corretamente.',
    alternativas: ['Os candidatos, estudaram muito.', 'Os candidatos estudaram muito, mas não passaram.', 'Os candidatos estudaram, muito.', 'Os, candidatos estudaram muito.'],
    correta: 1, dificuldade: 1,
    explicacao: 'Usa-se vírgula antes de "mas" (conjunção adversativa). Não se separa o sujeito do verbo nem o verbo do seu complemento com vírgula.',
    fonte: autoral,
  },
  {
    id: 'pt-pont-2', disciplina: 'portugues', assunto: 'Pontuação',
    enunciado: 'Em "Maria, a coordenadora do curso, aprovou o plano", as vírgulas isolam um aposto explicativo.',
    alternativas: CE, correta: 0, dificuldade: 1,
    explicacao: 'Certo. "A coordenadora do curso" explica quem é Maria: é um aposto explicativo, isolado por vírgulas.',
    fonte: estiloCebraspe,
  },
  {
    id: 'pt-pont-3', disciplina: 'portugues', assunto: 'Pontuação',
    enunciado: 'Em qual frase a vírgula separa um vocativo?',
    alternativas: ['Pedro, feche a porta.', 'Pedro fechou a porta.', 'Ele disse que Pedro fechou a porta.', 'A porta foi fechada por Pedro.'],
    correta: 0, dificuldade: 1,
    explicacao: 'Vocativo é o termo usado para chamar alguém ("Pedro, ...") e sempre vem separado por vírgula.',
    fonte: autoral,
  },
  {
    id: 'pt-pont-4', disciplina: 'portugues', assunto: 'Pontuação',
    enunciado: 'Na frase "Quando o edital sair, começarei a estudar", a vírgula é usada porque a oração adverbial está antes da oração principal.',
    alternativas: CE, correta: 0, dificuldade: 2,
    explicacao: 'Certo. Oração adverbial anteposta à principal é separada por vírgula.',
    fonte: estiloCebraspe,
  },
];
