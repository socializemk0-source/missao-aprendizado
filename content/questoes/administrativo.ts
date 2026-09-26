import type { Questao } from '../types.js';

const CE = ['Certo', 'Errado'];
const autoral = { tipo: 'autoral' } as const;
const estiloCebraspe = { tipo: 'autoral', estilo: 'Cebraspe' } as const;

export const ADMINISTRATIVO: Questao[] = [
  // ---- Princípios ----
  {
    id: 'adm-princ-1', disciplina: 'administrativo', assunto: 'Princípios',
    enunciado: 'O princípio segundo o qual a Administração só pode agir quando a lei autoriza é o da:',
    alternativas: ['legalidade', 'publicidade', 'eficiência', 'moralidade'],
    correta: 0,
    explicacao: 'Para a Administração, a legalidade é estrita: ela só faz o que a lei permite. O particular, ao contrário, pode fazer tudo o que a lei não proíbe.',
    fonte: autoral,
  },
  {
    id: 'adm-princ-2', disciplina: 'administrativo', assunto: 'Princípios',
    enunciado: 'Pelo princípio da autotutela, a Administração pode anular seus próprios atos ilegais e revogar os que se tornaram inconvenientes ou inoportunos.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo (Súmula 473 do STF). A revogação respeita os direitos adquiridos e, em qualquer caso, cabe apreciação judicial.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-princ-3', disciplina: 'administrativo', assunto: 'Princípios',
    enunciado: 'A proibição de nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades na publicidade oficial está ligada principalmente ao princípio da:',
    alternativas: ['impessoalidade', 'eficiência', 'legalidade', 'continuidade'],
    correta: 0,
    explicacao: 'Art. 37, § 1º: a publicidade oficial deve ter caráter educativo, informativo ou de orientação social. O ato é da Administração, não da pessoa (impessoalidade).',
    fonte: autoral,
  },
  {
    id: 'adm-princ-4', disciplina: 'administrativo', assunto: 'Princípios',
    enunciado: 'O princípio da eficiência foi incluído expressamente no art. 37 da Constituição pela Emenda Constitucional nº 19/1998.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo. A EC 19/1998 (Reforma Administrativa) acrescentou a eficiência ao caput do art. 37.',
    fonte: estiloCebraspe,
  },
  // ---- Poderes administrativos ----
  {
    id: 'adm-pod-1', disciplina: 'administrativo', assunto: 'Poderes administrativos',
    enunciado: 'O poder que permite à Administração condicionar e restringir o uso de bens, atividades e direitos individuais em benefício do interesse público é o poder:',
    alternativas: ['hierárquico', 'de polícia', 'disciplinar', 'regulamentar'],
    correta: 1,
    explicacao: 'Poder de polícia: fiscalização sanitária, alvarás, multas de trânsito. Ele alcança os particulares em geral.',
    fonte: autoral,
  },
  {
    id: 'adm-pod-2', disciplina: 'administrativo', assunto: 'Poderes administrativos',
    enunciado: 'A aplicação de uma penalidade a um servidor, após processo administrativo, é expressão do poder:',
    alternativas: ['disciplinar', 'de polícia', 'regulamentar', 'normativo'],
    correta: 0,
    explicacao: 'O poder disciplinar permite apurar infrações e punir servidores e demais pessoas sujeitas à disciplina administrativa.',
    fonte: autoral,
  },
  {
    id: 'adm-pod-3', disciplina: 'administrativo', assunto: 'Poderes administrativos',
    enunciado: 'O poder regulamentar permite ao chefe do Poder Executivo expedir decretos e regulamentos para a fiel execução das leis.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo (art. 84, IV, da Constituição). O regulamento detalha a lei, mas não pode inovar nem contrariá-la.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-pod-4', disciplina: 'administrativo', assunto: 'Poderes administrativos',
    enunciado: 'O poder hierárquico permite ao superior dar ordens, fiscalizar, delegar e avocar atribuições dos subordinados.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo. A hierarquia organiza a relação de subordinação dentro da estrutura administrativa.',
    fonte: estiloCebraspe,
  },
  // ---- Elementos e extinção dos atos ----
  {
    id: 'adm-ato-1', disciplina: 'administrativo', assunto: 'Atos administrativos',
    enunciado: 'São elementos (requisitos) do ato administrativo:',
    alternativas: ['competência, finalidade, forma, motivo e objeto', 'legalidade, finalidade, forma, publicidade e objeto', 'competência, imperatividade, forma, motivo e mérito', 'sujeito, vontade, publicidade, motivo e eficácia'],
    correta: 0,
    explicacao: 'Memorize "COM FI FOR M OB": COMpetência, FInalidade, FORma, Motivo e OBjeto.',
    fonte: autoral,
  },
  {
    id: 'adm-ato-2', disciplina: 'administrativo', assunto: 'Atos administrativos',
    enunciado: 'A competência para praticar o ato administrativo decorre da lei e não pode ser renunciada pelo agente.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo. A competência é irrenunciável; pode, porém, ser delegada ou avocada nos casos previstos em lei.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-ato-3', disciplina: 'administrativo', assunto: 'Atos administrativos',
    enunciado: 'A retirada de um ato válido que deixou de ser conveniente e oportuno chama-se:',
    alternativas: ['anulação', 'revogação', 'cassação', 'caducidade'],
    correta: 1,
    explicacao: 'Revogação: ato válido, retirado por mérito (conveniência e oportunidade), só pela própria Administração. Anulação: ato ilegal.',
    fonte: autoral,
  },
  {
    id: 'adm-ato-4', disciplina: 'administrativo', assunto: 'Atos administrativos',
    enunciado: 'A anulação de um ato administrativo ilegal pode ser feita pela própria Administração ou pelo Poder Judiciário.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo. A ilegalidade pode ser reconhecida pela Administração (autotutela) ou pelo Judiciário, quando provocado.',
    fonte: estiloCebraspe,
  },
  // ---- Atributos ----
  {
    id: 'adm-atr-1', disciplina: 'administrativo', assunto: 'Atributos do ato',
    enunciado: 'O atributo que faz presumir que o ato foi praticado de acordo com a lei, até prova em contrário, é a:',
    alternativas: ['presunção de legitimidade', 'imperatividade', 'autoexecutoriedade', 'tipicidade'],
    correta: 0,
    explicacao: 'A presunção de legitimidade (e de veracidade) é relativa: vale até que se prove o contrário.',
    fonte: autoral,
  },
  {
    id: 'adm-atr-2', disciplina: 'administrativo', assunto: 'Atributos do ato',
    enunciado: 'A autoexecutoriedade permite que a Administração execute certos atos diretamente, sem precisar de autorização prévia do Poder Judiciário.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo. Exemplo: apreensão de mercadoria estragada pela vigilância sanitária.',
    fonte: estiloCebraspe,
  },
  {
    id: 'adm-atr-3', disciplina: 'administrativo', assunto: 'Atributos do ato',
    enunciado: 'A imperatividade significa que o ato administrativo:',
    alternativas: ['se impõe a terceiros, independentemente da concordância deles', 'só vale depois de publicado no Diário Oficial', 'precisa de aprovação judicial', 'nunca pode ser revogado'],
    correta: 0,
    explicacao: 'Imperatividade (ou coercibilidade): o ato cria obrigações para terceiros mesmo sem a concordância deles.',
    fonte: autoral,
  },
  {
    id: 'adm-atr-4', disciplina: 'administrativo', assunto: 'Atributos do ato',
    enunciado: 'Todo ato administrativo possui o atributo da autoexecutoriedade.',
    alternativas: CE, correta: 1,
    explicacao: 'Errado. Nem todo ato é autoexecutório. A cobrança forçada de uma multa, por exemplo, depende de execução judicial.',
    fonte: estiloCebraspe,
  },
];
