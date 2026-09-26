import type { Questao } from '../types.js';

const CE = ['Certo', 'Errado'];
const autoral = { tipo: 'autoral' } as const;
const estiloCebraspe = { tipo: 'autoral', estilo: 'Cebraspe' } as const;

export const CONSTITUCIONAL: Questao[] = [
  // ---- Direitos individuais (art. 5º) ----
  {
    id: 'const-dir-1', disciplina: 'constitucional', assunto: 'Direitos individuais',
    enunciado: 'Segundo a Constituição, a casa é asilo inviolável do indivíduo, mas pode-se nela entrar, a qualquer hora e sem consentimento do morador, em caso de flagrante delito.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo (art. 5º, XI). Sem consentimento, só se entra em caso de flagrante delito, desastre ou para prestar socorro — a qualquer hora — ou, durante o dia, por determinação judicial.',
    fonte: estiloCebraspe,
  },
  {
    id: 'const-dir-2', disciplina: 'constitucional', assunto: 'Direitos individuais',
    enunciado: 'A entrada em uma casa sem o consentimento do morador, por determinação judicial, é permitida:',
    alternativas: ['a qualquer hora', 'somente durante o dia', 'somente à noite', 'nunca'],
    correta: 1,
    explicacao: 'Art. 5º, XI: por determinação judicial, apenas durante o dia.',
    fonte: autoral,
  },
  {
    id: 'const-dir-3', disciplina: 'constitucional', assunto: 'Direitos individuais',
    enunciado: 'A Constituição garante que ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo. É o princípio da legalidade para o particular (art. 5º, II): ele pode fazer tudo o que a lei não proíbe.',
    fonte: estiloCebraspe,
  },
  {
    id: 'const-dir-4', disciplina: 'constitucional', assunto: 'Direitos individuais',
    enunciado: 'Pela Constituição, a prática do racismo constitui:',
    alternativas: ['crime afiançável e prescritível', 'crime inafiançável e imprescritível, sujeito à pena de reclusão', 'contravenção penal', 'infração apenas administrativa'],
    correta: 1,
    explicacao: 'Art. 5º, XLII: o racismo é crime inafiançável e imprescritível, sujeito à pena de reclusão, nos termos da lei.',
    fonte: autoral,
  },
  // ---- Remédios constitucionais ----
  {
    id: 'const-rem-1', disciplina: 'constitucional', assunto: 'Remédios constitucionais',
    enunciado: 'O remédio constitucional que protege o direito de locomoção (ir e vir) é o:',
    alternativas: ['mandado de segurança', 'habeas data', 'habeas corpus', 'ação popular'],
    correta: 2,
    explicacao: 'Habeas corpus (art. 5º, LXVIII) protege a liberdade de locomoção contra ilegalidade ou abuso de poder.',
    fonte: autoral,
  },
  {
    id: 'const-rem-2', disciplina: 'constitucional', assunto: 'Remédios constitucionais',
    enunciado: 'Para conhecer ou corrigir informações sobre si mesmo em bancos de dados de entidades governamentais ou de caráter público, cabe:',
    alternativas: ['habeas corpus', 'habeas data', 'mandado de injunção', 'ação civil pública'],
    correta: 1,
    explicacao: 'Habeas data (art. 5º, LXXII): garante acesso e retificação de dados da própria pessoa.',
    fonte: autoral,
  },
  {
    id: 'const-rem-3', disciplina: 'constitucional', assunto: 'Remédios constitucionais',
    enunciado: 'O mandado de injunção é cabível quando a falta de norma regulamentadora torna inviável o exercício de direitos e liberdades constitucionais.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo (art. 5º, LXXI). Ele combate a omissão do legislador que impede o exercício de um direito.',
    fonte: estiloCebraspe,
  },
  {
    id: 'const-rem-4', disciplina: 'constitucional', assunto: 'Remédios constitucionais',
    enunciado: 'Qualquer cidadão é parte legítima para propor ação popular que vise a anular ato lesivo ao patrimônio público.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo (art. 5º, LXXIII). Salvo comprovada má-fé, o autor fica isento de custas e do ônus da sucumbência.',
    fonte: estiloCebraspe,
  },
  // ---- Princípios fundamentais ----
  {
    id: 'const-est-1', disciplina: 'constitucional', assunto: 'Princípios fundamentais',
    enunciado: 'São Poderes da União, independentes e harmônicos entre si:',
    alternativas: ['o Executivo, o Legislativo e o Judiciário', 'o Executivo, o Legislativo e o Ministério Público', 'a União, os Estados e os Municípios', 'a Presidência, o Congresso e o STF'],
    correta: 0,
    explicacao: 'Art. 2º: Legislativo, Executivo e Judiciário. O Ministério Público é função essencial à justiça, não um Poder.',
    fonte: autoral,
  },
  {
    id: 'const-est-2', disciplina: 'constitucional', assunto: 'Princípios fundamentais',
    enunciado: 'É fundamento da República Federativa do Brasil, segundo o art. 1º da Constituição:',
    alternativas: ['a dignidade da pessoa humana', 'a erradicação da pobreza', 'a independência nacional', 'a defesa da paz'],
    correta: 0,
    explicacao: 'Fundamentos (art. 1º): soberania, cidadania, dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa e pluralismo político. Erradicar a pobreza é objetivo (art. 3º); independência nacional e defesa da paz são princípios das relações internacionais (art. 4º).',
    fonte: autoral,
  },
  {
    id: 'const-est-3', disciplina: 'constitucional', assunto: 'Princípios fundamentais',
    enunciado: 'Construir uma sociedade livre, justa e solidária é um dos objetivos fundamentais da República.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo (art. 3º, I). Dica: os objetivos começam com verbos (construir, garantir, erradicar, promover).',
    fonte: estiloCebraspe,
  },
  {
    id: 'const-est-4', disciplina: 'constitucional', assunto: 'Princípios fundamentais',
    enunciado: 'A República Federativa do Brasil é formada pela união indissolúvel dos Estados, dos Municípios e do Distrito Federal.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo (art. 1º). Por ser indissolúvel, nenhum ente pode se separar da Federação.',
    fonte: estiloCebraspe,
  },
  // ---- Administração Pública (art. 37) ----
  {
    id: 'const-adm-1', disciplina: 'constitucional', assunto: 'Administração Pública',
    enunciado: 'Os princípios expressos da administração pública no caput do art. 37 da Constituição são:',
    alternativas: ['legalidade, impessoalidade, moralidade, publicidade e eficiência', 'legalidade, finalidade, moralidade, publicidade e economicidade', 'legalidade, impessoalidade, razoabilidade, publicidade e eficiência', 'supremacia do interesse público, legalidade, moralidade, publicidade e eficiência'],
    correta: 0,
    explicacao: 'Memorize o LIMPE: Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência.',
    fonte: autoral,
  },
  {
    id: 'const-adm-2', disciplina: 'constitucional', assunto: 'Administração Pública',
    enunciado: 'O prazo de validade do concurso público é de:',
    alternativas: ['até 2 anos, prorrogável uma vez por igual período', '1 ano, improrrogável', 'até 4 anos, prorrogável duas vezes', '5 anos'],
    correta: 0,
    explicacao: 'Art. 37, III: até dois anos, prorrogável uma vez, por igual período.',
    fonte: autoral,
  },
  {
    id: 'const-adm-3', disciplina: 'constitucional', assunto: 'Administração Pública',
    enunciado: 'A nomeação para cargo em comissão, declarado em lei de livre nomeação e exoneração, depende de aprovação prévia em concurso público.',
    alternativas: CE, correta: 1,
    explicacao: 'Errado. Art. 37, II: os cargos em comissão de livre nomeação e exoneração são a exceção à regra do concurso.',
    fonte: estiloCebraspe,
  },
  {
    id: 'const-adm-4', disciplina: 'constitucional', assunto: 'Administração Pública',
    enunciado: 'É garantido ao servidor público civil o direito à livre associação sindical.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo (art. 37, VI). Já o direito de greve é exercido nos termos e limites de lei específica (art. 37, VII).',
    fonte: estiloCebraspe,
  },
];
