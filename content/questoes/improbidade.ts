import type { Questao } from '../types.js';

// Improbidade administrativa: Lei 8.429/1992 com a redação da Lei
// 14.230/2021 (a que vale hoje). Questões autorais, escritas a partir do
// texto da lei e de teses fixadas pelo STF — não de material de cursos.

const CE = ['Certo', 'Errado'];
const autoral = { tipo: 'autoral' } as const;
const estiloCebraspe = { tipo: 'autoral', estilo: 'Cebraspe' } as const;

export const IMPROBIDADE: Questao[] = [
  // ---- Dolo e sujeitos ----
  {
    id: 'adm-imp-1', disciplina: 'administrativo', assunto: 'Improbidade: dolo e sujeitos',
    enunciado: 'Após a Lei nº 14.230/2021, somente condutas dolosas configuram ato de improbidade administrativa.',
    alternativas: CE, correta: 0, dificuldade: 1,
    explicacao: 'Certo. Pelo art. 1º, § 1º, da Lei 8.429/1992 (redação da Lei 14.230/2021), atos de improbidade são as condutas dolosas tipificadas nos arts. 9º, 10 e 11. A antiga lesão ao erário culposa deixou de existir.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-imp-2', disciplina: 'administrativo', assunto: 'Improbidade: dolo e sujeitos',
    enunciado: 'Para a Lei de Improbidade Administrativa, na redação atual, considera-se dolo:',
    alternativas: [
      'a vontade livre e consciente de alcançar o resultado ilícito tipificado, não bastando a voluntariedade do agente',
      'a simples voluntariedade do agente ao praticar o ato',
      'a negligência grave no cuidado com a coisa pública',
      'o exercício da função pública do qual resulte qualquer prejuízo',
    ],
    correta: 0, dificuldade: 2,
    explicacao: 'O art. 1º, § 2º, define dolo como a vontade livre e consciente de alcançar o resultado ilícito, não bastando a voluntariedade. E o § 3º diz que o mero exercício da função, sem prova de ato doloso com fim ilícito, afasta a responsabilidade.',
    fonte: autoral,
  },
  {
    id: 'adm-imp-3', disciplina: 'administrativo', assunto: 'Improbidade: dolo e sujeitos',
    enunciado: 'O particular que não é agente público nunca responde por ato de improbidade administrativa.',
    alternativas: CE, correta: 1, dificuldade: 1,
    explicacao: 'Errado. O art. 3º aplica a lei, no que couber, a quem, mesmo não sendo agente público, induza ou concorra dolosamente para a prática do ato de improbidade.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-imp-4', disciplina: 'administrativo', assunto: 'Improbidade: dolo e sujeitos',
    enunciado: 'O sucessor ou herdeiro de quem causou dano ao erário ou se enriqueceu ilicitamente está sujeito à obrigação de repará-lo até o limite do valor da herança ou do patrimônio transferido.',
    alternativas: CE, correta: 0, dificuldade: 2,
    explicacao: 'Certo. É o que prevê o art. 8º da Lei 8.429/1992: a obrigação de reparar passa ao sucessor ou herdeiro, mas só até o limite da herança ou do patrimônio transferido.',
    fonte: estiloCebraspe,
  },

  // ---- Modalidades ----
  {
    id: 'adm-imp-5', disciplina: 'administrativo', assunto: 'Improbidade: modalidades',
    enunciado: 'A Lei nº 8.429/1992 prevê três espécies de atos de improbidade administrativa. São elas:',
    alternativas: [
      'enriquecimento ilícito, lesão ao erário e violação aos princípios da administração pública',
      'enriquecimento ilícito, lesão ao erário e abuso de autoridade',
      'lesão ao erário, nepotismo e prevaricação',
      'enriquecimento ilícito, peculato e corrupção passiva',
    ],
    correta: 0, dificuldade: 1,
    explicacao: 'As três espécies estão nos arts. 9º (enriquecimento ilícito), 10 (lesão ao erário) e 11 (atentado aos princípios da administração pública). Peculato, prevaricação e corrupção passiva são crimes, previstos no Código Penal.',
    fonte: autoral,
  },
  {
    id: 'adm-imp-6', disciplina: 'administrativo', assunto: 'Improbidade: modalidades',
    enunciado: 'Um servidor que recebe, para si, vantagem econômica indevida em razão do cargo pratica ato de improbidade que:',
    alternativas: [
      'importa enriquecimento ilícito',
      'causa lesão ao erário',
      'atenta contra os princípios da administração pública, apenas',
      'não é improbidade, apenas crime',
    ],
    correta: 0, dificuldade: 1,
    explicacao: 'Auferir vantagem patrimonial indevida em razão do cargo é o núcleo do art. 9º: enriquecimento ilícito. A mesma conduta pode também ser crime, mas as esferas são independentes.',
    fonte: autoral,
  },
  {
    id: 'adm-imp-7', disciplina: 'administrativo', assunto: 'Improbidade: modalidades',
    enunciado: 'Com a Lei nº 14.230/2021, a lesão ao erário causada por negligência na conservação do patrimônio público continua a configurar ato de improbidade administrativa.',
    alternativas: CE, correta: 1, dificuldade: 2,
    explicacao: 'Errado. A modalidade culposa do art. 10 foi revogada: só a lesão ao erário dolosa é improbidade. A negligência pode gerar outras responsabilidades (disciplinar, civil), mas não improbidade.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-imp-8', disciplina: 'administrativo', assunto: 'Improbidade: modalidades',
    enunciado: 'Após a Lei nº 14.230/2021, o rol de condutas que configuram ato de improbidade por violação aos princípios da administração pública (art. 11) passou a ser taxativo.',
    alternativas: CE, correta: 0, dificuldade: 3,
    explicacao: 'Certo. O caput do art. 11 passou a dizer que o ato é "caracterizado por uma das seguintes condutas", e não mais "notadamente". Só as condutas listadas nos incisos configuram essa modalidade.',
    fonte: estiloCebraspe,
  },

  // ---- Sanções ----
  {
    id: 'adm-imp-9', disciplina: 'administrativo', assunto: 'Improbidade: sanções',
    enunciado: 'A Constituição Federal prevê, para os atos de improbidade administrativa, a suspensão dos direitos políticos, a perda da função pública, a indisponibilidade dos bens e o ressarcimento ao erário, sem prejuízo da ação penal cabível.',
    alternativas: CE, correta: 0, dificuldade: 1,
    explicacao: 'Certo. É a redação do art. 37, § 4º, da Constituição. A Lei 8.429/1992 regulamenta esse dispositivo e define as gradações.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-imp-10', disciplina: 'administrativo', assunto: 'Improbidade: sanções',
    enunciado: 'No ato de improbidade que importa enriquecimento ilícito (art. 9º), a suspensão dos direitos políticos pode chegar a:',
    alternativas: ['até 14 anos', 'até 8 anos', 'até 12 anos', 'até 10 anos'],
    correta: 0, dificuldade: 3,
    explicacao: 'Pelo art. 12, I, a suspensão dos direitos políticos vai até 14 anos no enriquecimento ilícito. Na lesão ao erário (art. 12, II), vai até 12 anos.',
    fonte: autoral,
  },
  {
    id: 'adm-imp-11', disciplina: 'administrativo', assunto: 'Improbidade: sanções',
    enunciado: 'Na condenação por ato que atenta contra os princípios da administração pública (art. 11), a lei não prevê a suspensão dos direitos políticos.',
    alternativas: CE, correta: 0, dificuldade: 3,
    explicacao: 'Certo. Pelo art. 12, III, as sanções para o art. 11 são multa civil de até 24 vezes a remuneração do agente e proibição de contratar com o poder público por até 4 anos. A suspensão dos direitos políticos saiu dessa modalidade.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-imp-12', disciplina: 'administrativo', assunto: 'Improbidade: sanções',
    enunciado: 'A aplicação das sanções de improbidade depende, em regra, da efetiva ocorrência de dano ao patrimônio público.',
    alternativas: CE, correta: 1, dificuldade: 2,
    explicacao: 'Errado. Pelo art. 21, I, as sanções independem da efetiva ocorrência de dano, salvo quanto ao ressarcimento e às condutas de lesão ao erário do art. 10.',
    fonte: estiloCebraspe,
  },

  // ---- Processo e prescrição ----
  {
    id: 'adm-imp-13', disciplina: 'administrativo', assunto: 'Improbidade: processo e prescrição',
    enunciado: 'Pela redação atual da Lei nº 8.429/1992, a ação para aplicar as sanções de improbidade prescreve em:',
    alternativas: [
      '8 anos, contados da ocorrência do fato ou, nas infrações permanentes, do dia em que cessou a permanência',
      '5 anos, contados do término do mandato, cargo em comissão ou função de confiança',
      '5 anos, contados da ocorrência do fato',
      'nunca: a ação de improbidade é imprescritível',
    ],
    correta: 0, dificuldade: 2,
    explicacao: 'O art. 23, com a redação da Lei 14.230/2021, fixou prazo único de 8 anos, contado do fato (ou do fim da permanência). O prazo de 5 anos a partir do fim do mandato era a regra antiga.',
    fonte: autoral,
  },
  {
    id: 'adm-imp-14', disciplina: 'administrativo', assunto: 'Improbidade: processo e prescrição',
    enunciado: 'Segundo o STF, é imprescritível a ação de ressarcimento ao erário fundada na prática de ato doloso tipificado na Lei de Improbidade Administrativa.',
    alternativas: CE, correta: 0, dificuldade: 2,
    explicacao: 'Certo. É a tese do Tema 897 da repercussão geral, com base no art. 37, § 5º, da Constituição. O que prescreve são as demais sanções; o ressarcimento por ato doloso, não.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-imp-15', disciplina: 'administrativo', assunto: 'Improbidade: processo e prescrição',
    enunciado: 'Na ação de improbidade, a indisponibilidade de bens dispensa a demonstração de perigo de dano irreparável ou de risco ao resultado útil do processo, pois esse perigo é presumido.',
    alternativas: CE, correta: 1, dificuldade: 3,
    explicacao: 'Errado. Com a Lei 14.230/2021, o art. 16, § 3º, passou a exigir a demonstração do perigo de dano irreparável ou do risco ao resultado útil do processo. O perigo presumido era o entendimento anterior.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-imp-16', disciplina: 'administrativo', assunto: 'Improbidade: processo e prescrição',
    enunciado: 'É possível celebrar acordo de não persecução civil em matéria de improbidade, desde que dele resulte, ao menos, o integral ressarcimento do dano e a reversão da vantagem indevida obtida.',
    alternativas: CE, correta: 0, dificuldade: 2,
    explicacao: 'Certo. O art. 17-B exige, no mínimo, o integral ressarcimento do dano e a reversão à pessoa jurídica lesada da vantagem indevida obtida.',
    fonte: estiloCebraspe,
  },
];
