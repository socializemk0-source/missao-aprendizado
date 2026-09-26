// Redação: bancas, guias de cada banca, rubrica e temas. Conteúdo próprio
// (veio do V1). Os temas são propostas autorais no estilo de cada banca.

export type BancaRedacao = (typeof BANCAS_REDACAO)[number];

export interface GuiaBanca {
  name: string;
  shortName: string;
  icon: string;
  badge: string;
  idealLines: string;
  structure: string;
  loves: string[];
  avoids: string[];
  formula: string;
}

export interface Criterio { id: 'tema' | 'argumentos' | 'organizacao' | 'linguagem'; label: string; max: number; description: string }

export interface Tema { id: string; bank: BancaRedacao; title: string; prompt: string; support: string; questions: string[] }

export const BANCAS_REDACAO = [
  "Treino geral",
  "Cebraspe",
  "FGV",
  "FCC",
  "Vunesp",
  "Cesgranrio"
] as const;

export const GUIAS_BANCA: Record<BancaRedacao, GuiaBanca> = {
  Cebraspe: {
    name: "Cebraspe (CESPE)",
    shortName: "Cebraspe",
    icon: "🎯",
    badge: "Padrão de Resposta em Tópicos · Sem Título",
    idealLines: "25 a 30 linhas (mínimo 20)",
    structure: "Introdução objetiva (curta/opcional) + 3 parágrafos de desenvolvimento respondendo cada tópico individualmente + fechamento breve",
    loves: [
      "Responder explicitamente a cada um dos tópicos propostos no comando da prova.",
      "Conectivos pontuais no início dos parágrafos ('Inicialmente, quanto ao aspecto...', 'Ademais, no que concerne a...', 'Por fim, no tocante a...')",
      "Letra legível e respeito escrupuloso às margens laterais da folha de resposta.",
      "Precisão técnica e ancoragem nas leis, CF/88 e doutrina consolidada."
    ],
    avoids: [
      "NUNCA coloque título (o Cebraspe não exige título e você gasta linha preciosa, podendo perder pontos).",
      "Evite introduções longas ou floreios que não respondam aos tópicos avaliados.",
      "Evite rasuras desleixadas (se errar, passe um risco simples e continue).",
      "Evite ultrapassar a linha 30 ou escrever no espaço das margens."
    ],
    formula: "NPD = NC - 2 × (NE / TL) [Nota Final = Conteúdo - 2×(Erros/Linhas)]"
  },
  FGV: {
    name: "Fundação Getulio Vargas (FGV)",
    shortName: "FGV",
    icon: "⚖️",
    badge: "Tese Contundente · Rigor Vocabular · Densidade",
    idealLines: "25 a 30 linhas",
    structure: "1 parágrafo de Introdução com tese explícita + 2 a 3 parágrafos de Desenvolvimento com dados/autores + 1 parágrafo de Conclusão reflexiva",
    loves: [
      "Tese clara, explícita e defensável já no primeiro parágrafo.",
      "Vocabulário formal, culto e preciso (eliminar palavras vagas como 'coisa', 'fazer', 'bom').",
      "Argumentos consistentes baseados em legislação, doutrina, dados ou fatos notórios.",
      "Coesão referencial e sequencial impecável entre todos os períodos."
    ],
    avoids: [
      "Evite chavões e clichês ('desde os primórdios', 'atualmente vivemos', 'nos dias de hoje').",
      "Evite parágrafos de uma frase só (períodos muito longos ou fragmentados).",
      "Evite neutralidade em temas argumentativos: a FGV exige posicionamento firme.",
      "Evite proposta de intervenção no estilo ENEM (a FGV quer síntese crítica e desfecho reflexivo)."
    ],
    formula: "Parte I (Estrutura e Conteúdo: 60%) + Parte II (Correção Gramatical e Linguagem: 40%)"
  },
  FCC: {
    name: "Fundação Carlos Chagas (FCC)",
    shortName: "FCC",
    icon: "🏛️",
    badge: "Maturidade Filosófica · Tribunais · Fuga do Senso Comum",
    idealLines: "25 a 30 linhas",
    structure: "Introdução problematizadora + Desenvolvimento com repertório crítico legitimado + Conclusão sintética e propositiva",
    loves: [
      "Repertório sociocultural legitimado (filosofia, sociologia, literatura, direito constitucional).",
      "Profundidade reflexiva e articulação com a cidadania, ética e dignidade humana.",
      "Progressão temática fluida com períodos bem construídos.",
      "Capacidade de enxergar os temas sob a ótica dos direitos fundamentais."
    ],
    avoids: [
      "Evite argumentos de senso comum ou moralistas sem fundamentação técnica/filosófica.",
      "Evite listagem de exemplos sem análise crítica do que eles representam.",
      "Evite informalidade ou termos coloquiais.",
      "Evite tangenciar o tema ou focar apenas em aspectos secundários dos textos de apoio."
    ],
    formula: "Conteúdo (40 a 50 pts) + Estrutura (30 a 40 pts) + Expressão/Gramática (20 a 30 pts)"
  },
  Vunesp: {
    name: "Fundação VUNESP",
    shortName: "Vunesp",
    icon: "📝",
    badge: "Pergunta-Problema · Resposta Direta · Coesão",
    idealLines: "25 a 30 linhas",
    structure: "Introdução com resposta direta à pergunta da banca + Desenvolvimento com sustentação e contra-argumentação + Conclusão que reafirma a tese",
    loves: [
      "Responder diretamente à questão-problema formulada no tema.",
      "Apresentar tese explícita e defender um lado com coerência e imparcialidade reflexiva.",
      "Uso de repertório que dialogue com o contexto brasileiro contemporâneo.",
      "Clareza e objetividade na organização textual."
    ],
    avoids: [
      "Ficar 'em cima do muro' diante de uma pergunta temática polarizada.",
      "Copiar trechos dos textos de apoio (a Vunesp desconta severamente cópias).",
      "Uso de gírias, oralidade e desvios de regência ou concordância.",
      "Fuga total ou parcial do tema proposto."
    ],
    formula: "Critério A (Tema e Tese: 30%) + Critério B (Estrutura e Coesão: 30%) + Critério C (Expressão: 40%)"
  },
  Cesgranrio: {
    name: "Fundação Cesgranrio (CNU / Bancos / Federais)",
    shortName: "Cesgranrio",
    icon: "🌐",
    badge: "Políticas Públicas · Cidadania & Inclusão · Viabilidade Prática",
    idealLines: "25 a 30 linhas (mínimo 20)",
    structure: "Introdução contextualizando o desafio público + Desenvolvimento com causas, impactos e ações viáveis + Conclusão com proposta integrada",
    loves: [
      "Foco na função social do Estado e no atendimento humanizado ao cidadão.",
      "Menção a marcos legais fundamentais (CF/88, Estatuto da Igualdade Racial, LGPD, etc.).",
      "Propostas concretas, éticas e sustentáveis com agentes e meios viáveis.",
      "Linguagem clara, objetiva e inclusiva."
    ],
    avoids: [
      "Propostas utópicas ou desconectadas da realidade orçamentária e administrativa.",
      "Desrespeito a direitos humanos e princípios fundamentais do serviço público.",
      "Textos excessivamente teóricos que ignoram o impacto na vida da população.",
      "Prolixidade sem clareza expositiva."
    ],
    formula: "Adequação ao Tema (30 pts) + Domínio Técnico e Estrutura (40 pts) + Norma-Padrão (30 pts)"
  },
  "Treino geral": {
    name: "Treino Geral",
    shortName: "Geral",
    icon: "💡",
    badge: "Fundamentos da Escrita Dissertativo-Argumentativa",
    idealLines: "20 a 30 linhas",
    structure: "Introdução (Tese) + 2 Parágrafos de Desenvolvimento + Conclusão",
    loves: [
      "Clareza de ideias e progressão lógica.",
      "Uso adequado de conectivos entre as orações e parágrafos.",
      "Respeito à norma culta da língua portuguesa.",
      "Divisão equilibrada dos parágrafos."
    ],
    avoids: [
      "Fuga ao tema proposto.",
      "Textos com menos de 15 a 20 linhas.",
      "Repetição excessiva das mesmas palavras.",
      "Frases sem verbo ou períodos truncados."
    ],
    formula: "Tema (20 pts) + Argumentação (30 pts) + Organização (20 pts) + Linguagem (30 pts)"
  }
};

export const CRITERIOS: readonly Criterio[] = [
  {
    id: "tema",
    label: "Tema e tese",
    max: 20,
    description: "Responde ao tema e apresenta um posicionamento claro de acordo com a banca."
  },
  {
    id: "argumentos",
    label: "Argumentação e Conteúdo",
    max: 30,
    description: "Desenvolve razões, exemplos, tópicos exigidos e repertório que sustentam a proposta."
  },
  {
    id: "organizacao",
    label: "Estrutura e Coesão",
    max: 20,
    description: "Articula parágrafos com conectivos adequados, progressão textual e padrão estrutural da banca."
  },
  {
    id: "linguagem",
    label: "Norma-padrão e Precisão",
    max: 30,
    description: "Emprega concordância, regência, pontuação, ortografia e vocabulário formal apropriado."
  }
];

export const TEMAS: readonly Tema[] = [
  {
    id: "cebraspe-seguranca",
    bank: "Cebraspe",
    title: "A integração das forças de segurança e o combate às organizações criminosas",
    prompt: "Considerando que o texto acima tem caráter unicamente motivador, redija um texto dissertativo acerca da integração das forças de segurança pública no Brasil. Ao elaborar seu texto, aborde, necessariamente, os seguintes aspectos: 1. A importância da inteligência e da cooperação interestadual [9,50 pts]; 2. O papel da tecnologia no monitoramento e controle de fronteiras [9,50 pts]; 3. A garantia dos direitos fundamentais na atuação ostensiva [10,00 pts].",
    support: "O combate ao crime organizado exige ações coordenadas que superem divisões federativas. O compartilhamento de dados e operações conjuntas entre Polícia Federal, Polícia Rodoviária Federal e polícias estaduais têm se mostrado decisivos para desarticular rotas logísticas e financeiras.",
    questions: [
      "Aborde o Tópico 1 em parágrafo específico com conectivo de início ('Inicialmente, no tocante à cooperação...')",
      "Desenvolva o Tópico 2 detalhando ferramentas tecnológicas e vigilância integrada.",
      "Dedique o terceiro parágrafo ao Tópico 3, fundamentando a legalidade e dignidade humana."
    ]
  },
  {
    id: "cebraspe-governanca",
    bank: "Cebraspe",
    title: "Governança pública, transparência e compliance no combate à corrupção",
    prompt: "Redija um texto dissertativo acerca da governança e da integridade na administração pública. Em seu texto, atenda obrigatoriamente aos seguintes tópicos: 1. O papel dos órgãos de controle interno e externo na fiscalização [9,50 pts]; 2. A relevância dos programas de integridade (compliance) e canais de denúncia [9,50 pts]; 3. O impacto da transparência ativa na confiança do cidadão nas instituições [10,00 pts].",
    support: "A administração pública contemporânea adota modelos de conformidade e integridade inspirados nas melhores práticas globais, fortalecendo a prestação de contas (accountability) e mitigando desvios.",
    questions: [
      "Responda ao Tópico 1 destacando Tribunais de Contas e controladorias.",
      "Conecte o Tópico 2 à proteção do denunciante e cultura ética institucional.",
      "Encerre respondendo ao Tópico 3 com dados de transparência ativa."
    ]
  },
  {
    id: "fgv-ia-administracao",
    bank: "FGV",
    title: "Inteligência Artificial e os limites da discricionariedade administrativa",
    prompt: "A automação de processos decisórios pelo poder público promete celeridade, mas suscita debates sobre a impessoalidade e a devida motivação dos atos administrativos. Redija um texto dissertativo-argumentativo posicionando-se sobre os limites éticos e jurídicos do uso de algoritmos na tomada de decisões pelo Estado.",
    support: "O uso de sistemas automatizados e modelos de IA para análise de benefícios, fiscalização tributária e triagem judicial expande-se rapidamente. Críticos alertam para riscos de 'caixa-preta' algorítmica e discriminação sistêmica.",
    questions: [
      "Defina sua tese claramente na introdução: a IA deve ser ferramenta de apoio ou decisora final?",
      "Fundamente com princípios constitucionais (Art. 37 da CF/88: publicidade, moralidade, eficiência).",
      "Evite fórmulas prontas; elabore uma conclusão reflexiva e crítica."
    ]
  },
  {
    id: "fgv-reforma-tributaria",
    bank: "FGV",
    title: "Reforma tributária, justiça fiscal e o pacto federativo",
    prompt: "Redija um texto dissertativo-argumentativo discutindo como conciliar a necessária simplificação do sistema tributário brasileiro com a garantia da autonomia de Estados e Municípios e a redução da regressividade fiscal.",
    support: "O modelo tributário sobre o consumo historicamente onerou as camadas mais vulneráveis e gerou insegurança jurídica decorrente da guerra fiscal federativa.",
    questions: [
      "Apresente um posicionamento contundente sobre a simplificação tributária.",
      "Articule os desafios do pacto federativo sem perder a coesão vocabular culta.",
      "Sustente a necessidade de justiça fiscal redistributiva com argumentos sólidos."
    ]
  },
  {
    id: "fcc-trabalho-dignidade",
    bank: "FCC",
    title: "A dignidade da pessoa humana e as novas relações de trabalho por plataformas",
    prompt: "Com base na leitura reflexiva da realidade contemporânea, redija um texto dissertativo analisando as transformações do mundo do trabalho sob o império dos algoritmos, confrontando a flexibilidade prometida com a imperatividade da proteção social e da dignidade humana.",
    support: "Para muitos, o trabalho por aplicativo representa autonomia e oportunidade de renda; para outros, trata-se de precarização sem direitos básicos e subordinação a métricas invisíveis.",
    questions: [
      "Mobilize autores e conceitos sociológicos ou jurídicos (ex.: Bauman, Byung-Chul Han, valor social do trabalho).",
      "Evite juízos de senso comum ou maniqueísmos superficiais.",
      "Analise a responsabilidade das instituições e do Judiciário Trabalhista na garantia do patamar civilizatório mínimo."
    ]
  },
  {
    id: "fcc-justica-cidadania",
    bank: "FCC",
    title: "O acesso à justiça como instrumento de efetivação da cidadania plena",
    prompt: "Redija um texto dissertativo-argumentativo refletindo sobre o alcance do Poder Judiciário na redução das desigualdades estruturais brasileiras e na materialização das promessas constitucionais de cidadania.",
    support: "A judicialização de demandas por saúde, educação e moradia reflete ao mesmo tempo a confiança da sociedade na Justiça e os limites das políticas públicas do Executivo.",
    questions: [
      "Examine a tensão entre ativismo judicial, separação de poderes e garantia de direitos sociais.",
      "Explore o conceito de cidadania ativa e dignidade coletiva.",
      "Conclua com uma síntese que amarre coerentemente as premissas reflexivas adotadas."
    ]
  },
  {
    id: "vunesp-cameras-seguranca",
    bank: "Vunesp",
    title: "Câmeras corporais na atividade policial: garantia de transparência ou limitação operacional?",
    prompt: "A partir dos textos de apoio e de seus conhecimentos, redija um texto dissertativo-argumentativo em norma-padrão da língua portuguesa respondendo ao seguinte questionamento: o uso obrigatório de câmeras corporais por policiais militares fortalece a segurança pública e os direitos fundamentais ou compromete a pronta resposta e a autonomia operacional das corporações?",
    support: "Estudos indicam redução de letalidade policial e de mortes de policiais em batalhões que adotaram câmeras; por outro lado, vozes no meio policial argumentam receio de hesitação em momentos de legítima defesa.",
    questions: [
      "Responda diretamente à pergunta central da proposta logo na introdução com tese explícita.",
      "Desenvolva argumentos sustentando sua escolha e refute contra-argumentos de forma fundamentada.",
      "Mantenha coerência lógica e conclua reafirmando a posição defendida."
    ]
  },
  {
    id: "vunesp-privatizacao-servicos",
    bank: "Vunesp",
    title: "A concessão de serviços essenciais à iniciativa privada: eficiência ou risco à universalidade?",
    prompt: "Redija um texto dissertativo-argumentativo em norma culta posicionando-se de maneira clara sobre a seguinte questão: a delegação de serviços públicos essenciais (como água, saneamento e transporte) à iniciativa privada assegura modernização e investimentos ou compromete o acesso universal das populações de baixa renda?",
    support: "Defensores apontam investimentos robustos e metas contratuais de atendimento; opositores alertam para reajustes tarifários e negligência em regiões periféricas de baixa rentabilidade.",
    questions: [
      "Tome partido explícito frente ao dilema da proposta, sem dubiedade.",
      "Fundamente com exemplos concretos de concessões e regulação estatal (agências reguladoras).",
      "Elabore uma conclusão consistente que amarre todo o raciocínio."
    ]
  },
  {
    id: "cesgranrio-equidade-cnu",
    bank: "Cesgranrio",
    title: "Políticas de cotas e equidade racial no fortalecimento do serviço público",
    prompt: "Considerando o papel do Estado como indutor da justiça social, redija um texto dissertativo acerca da relevância das ações afirmativas e da diversidade na composição do quadro de servidores públicos brasileiros para a formulação de políticas mais representativas.",
    support: "A Lei de Cotas no serviço público completou uma década, ampliando a representatividade em carreiras federais, embora ainda haja sub-representação nos postos de alta liderança governamental.",
    questions: [
      "Destaque o princípio da isonomia material e a reparação histórica.",
      "Discuta como servidores diversos compreendem melhor as dores da população usuária.",
      "Proponha medidas viáveis para consolidação de lideranças inclusivas na gestão pública."
    ]
  },
  {
    id: "cesgranrio-governo-digital",
    bank: "Cesgranrio",
    title: "Governo digital e a garantia de acesso para cidadãos em vulnerabilidade",
    prompt: "Redija um texto dissertativo-argumentativo analisando os avanços da plataforma Gov.br e os desafios para assegurar que a digitalização dos serviços públicos não crie novas formas de exclusão social e desamparo ao cidadão.",
    support: "Milhões de brasileiros realizam serviços públicos pelo celular, mas quase 30 milhões de pessoas ainda não possuem acesso estável à internet ou letramento digital suficiente.",
    questions: [
      "Contextualize o salto de eficiência administrativa propiciado pela tecnologia.",
      "Aponte os obstáculos enfrentados por idosos e populações de baixa renda.",
      "Apresente propostas práticas de atendimento híbrido (presencial + digital) humanizado."
    ]
  },
  {
    id: "digital",
    bank: "Treino geral",
    title: "Inclusão digital no acesso aos serviços públicos",
    prompt: "Discuta como ampliar os serviços digitais sem excluir cidadãos com dificuldades de acesso à tecnologia.",
    support: "Situação fictícia: um município passou a agendar atendimentos pela internet. Parte dos moradores não dispõe de conexão ou tem dificuldade para usar o sistema. A equipe precisa conciliar agilidade e acesso.",
    questions: [
      "Qual problema merece prioridade?",
      "Que consequências atingem o cidadão?",
      "Como sustentar uma solução viável?"
    ]
  },
  {
    id: "atendimento",
    bank: "Treino geral",
    title: "Atendimento humanizado e eficiência",
    prompt: "Discuta como conciliar eficiência administrativa e atendimento humanizado ao cidadão.",
    support: "Situação fictícia: uma unidade deseja reduzir filas. A equipe debate como agilizar o atendimento sem deixar de explicar procedimentos às pessoas que precisam de orientação.",
    questions: [
      "Rapidez é suficiente para definir qualidade?",
      "Que práticas podem atender às duas necessidades?",
      "Quais obstáculos precisam ser enfrentados?"
    ]
  },
  {
    id: "dados",
    bank: "Treino geral",
    title: "Uso responsável de dados no serviço público",
    prompt: "Analise desafios do uso de dados para melhorar serviços e preservar a confiança dos cidadãos.",
    support: "Situação fictícia: setores de uma instituição pretendem compartilhar informações para evitar solicitações repetidas de documentos. A proposta exige discutir finalidade, acesso e cuidados.",
    questions: [
      "Qual benefício você defenderá?",
      "Que risco precisa ser considerado?",
      "Como relacionar cuidado e confiança?"
    ]
  },
  {
    id: "comunicacao",
    bank: "Treino geral",
    title: "Linguagem clara na comunicação pública",
    prompt: "Discuta a importância da linguagem clara para o acesso do cidadão aos serviços públicos.",
    support: "Situação fictícia: um comunicado sobre inscrição recebeu muitas dúvidas. Embora trouxesse informações essenciais, utilizava siglas e expressões pouco conhecidas pelo público.",
    questions: [
      "Como a forma de escrever pode criar barreiras?",
      "Que exemplo sustenta sua tese?",
      "Como melhorar sem perder precisão?"
    ]
  },
  {
    id: "sustentabilidade",
    bank: "Treino geral",
    title: "Sustentabilidade na rotina administrativa",
    prompt: "Discuta como práticas sustentáveis podem ser incorporadas à rotina de uma instituição pública.",
    support: "Situação fictícia: uma equipe avalia consumo de papel, energia e materiais. O desafio é propor mudanças que possam ser acompanhadas ao longo do tempo.",
    questions: [
      "Qual prática teria impacto concreto?",
      "Como evitar uma discussão genérica?",
      "Como acompanhar os resultados?"
    ]
  },
  {
    id: "capacitacao",
    bank: "Treino geral",
    title: "Capacitação contínua dos servidores",
    prompt: "Analise o papel da capacitação contínua na melhoria dos serviços prestados à sociedade.",
    support: "Situação fictícia: um setor implantou um novo sistema, mas a equipe recebeu pouco tempo para aprender a utilizá-lo. Surgiram retrabalho e dúvidas de atendimento.",
    questions: [
      "Qual relação existe entre formação e qualidade?",
      "Que dificuldade de implementação merece atenção?",
      "Como concluir sem apenas repetir a introdução?"
    ]
  }
];

export const tema = (id: string) => TEMAS.find((t) => t.id === id);
export const isBanca = (v: unknown): v is BancaRedacao => typeof v === 'string' && (BANCAS_REDACAO as readonly string[]).includes(v);
