# Status do Aprova Tico

Leia este arquivo no começo de cada sessão, em vez de refazer o diagnóstico.
Atualize a linha da funcionalidade em todo PR que mexer nela.

Última atualização: 04/10/2026 (revisão de segurança: painéis do Supabase conferidos, V1 desligado do banco).

Legenda: **OK** = funcionando · **Parcial** = existe, mas falta parte · **Ausente** = não existe.
Prioridade: P0 bloqueia o uso · P1 jornada principal · P2 medição e retenção · P3 operação.

## Funcionalidades

| Funcionalidade | Estado | Situação | Problema | Prioridade | Próxima ação |
|---|---|---|---|---|---|
| Landing | Hero com a ilustração nova, questão de demonstração sem cadastro, planos, perguntas, captura de e-mail | OK | — | — | — |
| Cadastro, login e senha | E-mail/senha e Google pelo Supabase; "Esqueci minha senha" e `/redefinir-senha` | OK | As URLs de retorno das prévias da Vercel precisam estar liberadas no Supabase | P1 | Conferir *Redirect URLs* no Supabase (pedido ao dono) |
| Rotas e menu | 12 itens no menu, `/fase/:id`, `/praticar/:disciplina`, `/redacao/:id`, `/simulado/:id`, 404 em português | OK | Antes deste PR, uma tela quebrada mostrava a página de erro do React Router, em inglês | P0 | Corrigido: tela "Algo deu errado nesta tela" |
| Onboarding | `/comecar`: 5 passos (concurso e banca, data da prova, tempo por dia, nível, matérias). O servidor confere e grava em `v2.study_plans` (migração 0011). "Ajustar plano" reabre preenchido | OK | — | — | — |
| Painel "o que estudar hoje" | `/hoje` é a tela inicial (primeiro item do menu, destino depois do login e do app instalado). Meta de questões do dia, tarefas (revisar, avançar fase, praticar, simulado) que se marcam sozinhas, como estou (sequência, acerto e questões da semana, domínio médio), onde erro (3 assuntos mais fracos), quanto falta (fases, questões, previsão pelo ritmo e pela meta, comparada com a data da prova) | OK | — | — | — |
| Plano de estudos | `server/estudo.ts`: meta diária pelo tempo e nível; semana com matéria de foco por dia (mais fraca aparece mais; a que ainda não abriu na trilha, menos); simulado semanal com prova a 60 dias ou nível avançado. Recalculado a cada acesso pelo desempenho | OK | A trilha continua linear (uma fase abre a próxima, em todas as matérias) | P2 | Trilha por matéria, respeitando só as matérias do aluno |
| Trilha (capítulos e fases) | 6 disciplinas, fases com vidas, XP e bônus de fase; parte dos capítulos é PRO | OK | — | — | — |
| Questões da trilha | 96 questões autorais em `content/questoes/*.ts` (16 por arquivo), com explicação | OK | Direito ainda não passou por revisão de professor | P1 | Revisão por professor (conteúdo do dono) |
| Banco de questões (`v2.questions`) | Catálogo 5 min em memória; só `status = 'ativa'` chega ao aluno. 327 questões autorais em `revisao`: 27 do PR #5 (migração 0007) e o piloto de 300 (150 de Português e 150 de RLM, 10 por assunto, migração 0008), conferidas por resolução às cegas | Parcial | Nenhuma questão do banco foi revisada por professor; não há tela para revisar | P1 | Professor revisa uma amostra do piloto; se a taxa de correção for baixa, escalar para as outras matérias. Tela de revisão para professores |
| Correção com explicação | Servidor confere a resposta e devolve gabarito e explicação | OK | — | — | — |
| Caderno de erros / revisão | `/revisar`: revisão espaçada (`server/revisao.ts`): errou → hoje; acertou → amanhã, 7 e 30 dias; errou de novo → volta para hoje. Mostra a agenda das próximas revisões | OK | — | — | — |
| Domínio por assunto | `/disciplinas`: nota de 0 a 100 por assunto (acerto em todas as tentativas, última resposta, peso da dificuldade, perda por tempo sem ver) e situação (não visto, fraco, em progresso, dominado) | OK | O assunto da trilha é o título da fase | P3 | Usar a dificuldade real (% de acerto) quando houver respostas suficientes |
| Simulados | Fácil, médio, difícil e misto; por disciplina e estilo de banca; cronômetro opcional; resultado; erros vão para a revisão; grátis: 1 por dia | Parcial | Faltam marcar questão, confirmação de entrega, resultado por assunto e plano de revisão | P2 | Marco 2 |
| Filtros de questões | Prática por disciplina | Parcial | Faltam assunto, dificuldade, erradas, não respondidas, favoritas | P2 | Marco 2 |
| Progresso | XP, sequência, vidas, missões diárias, conquistas, ranking | OK | Não há visão semanal/mensal | P2 | Marco 2 |
| Redação com IA | OpenAI no servidor; nota por critério; grátis: 1 correção a cada 7 dias | OK | Sem `OPENAI_API_KEY` a correção fica desligada (com aviso) | — | — |
| Pagamentos (PRO) | Checkout Pro do Mercado Pago, 30 dias ou 1 ano, webhook com assinatura, confirmação na volta, compras registradas (`v2.checkouts`, migração 0009) e botão "Verificar meu pagamento" quando o aviso não chega | Parcial | Produção configurada e testada com PIX real (compra e devolução). Falta cupom | P1 | Cupom no Marco 4 |
| Perfil | Nome, plano e progresso | Parcial | Não há exclusão de conta | P3 | Marco 4 |
| Aparência e conforto | Tema claro/escuro/automático, sons (Web Audio), animações, modo foco/leitura (com tom creme) e "Aparência e som" no Perfil; tudo guardado no aparelho | OK | — | — | — |
| Tico e movimento | Tico em imagem fixa e leve (6 poses em WebP, ~40 KB cada; antes ~130 KB em PNG). Movimento só em CSS: transições de tela, pulso/tremida nas alternativas, XP voando, selo de sequência, confete | OK | A animação do Tico por quadros foi retirada a pedido do dono (qualidade e peso no celular) | P3 | Depois da validação, um artista faz as animações do Tico |
| Jogos | Desafio relâmpago + Radar do Tico (certo ou errado com explicação), Memória do Tico, Caça-palavras e Cruzadinha. Conteúdo autoral (`content/jogos.ts`: 83 termos e 80 afirmações). Servidor sorteia, guarda o gabarito e decide XP (só nas 3 primeiras rodadas completas de cada jogo por dia) e recorde; jogo não gasta vida e conta para a sequência de dias | OK | Conteúdo dos jogos ainda sem revisão de professor | P2 | Professor revisa glossário e afirmações; depois, ranking semanal dos jogos |
| Tutor IA | — | Ausente | — | P2 | Marco 3 |
| Notificações no app | — | Ausente | — | P2 | Marco 3 |
| Analytics (`v2.events`) | — | Ausente | — | P2 | Marco 2 |
| Admin | — | Ausente | Questões só mudam de status direto no banco | P3 | Marco 4 |
| App instalável (PWA) | Manifesto, ícones do Tico (inclusive o adaptável do Android e o do iPhone), service worker (`public/sw.js`), página "Sem conexão", aviso "Sem internet", aviso "Tem uma versão nova do app — Atualizar", botão "Instalar o app" no Perfil (passo a passo no iPhone) e aviso de instalar na Trilha. API, XP, PRO e pagamentos nunca passam pelo cache | OK | Login com Google e volta do Mercado Pago dentro do app instalado no iPhone ainda não foram testados num aparelho | P1 | Dono testa no Android e no iPhone (roteiro no PR). Depois: notificações (Marco 3) e estudar sem internet |
| Termos, privacidade, SEO | `/privacidade`, `/termos` (conta, PRO, desistência em 7 dias, conteúdo, redação por IA; link no rodapé e no Branding do Google), e-mail de contato `contato@aprovatico.com.br` e meta description | Parcial | Termos ainda sem revisão de advogado e sem razão social/CNPJ. Faltam imagem de compartilhamento, `robots.txt` e `sitemap.xml` | P3 | Dono revisa os termos com advogado. Resto no Marco 4 |

## Base técnica

| Item | Situação | Observação |
|---|---|---|
| Banco | OK | Migrações 0001–0012 aplicadas (conferido no SQL Editor em 04/10/2026: 17 tabelas no `v2`). `v2.questoes_proprias` é a cópia antiga das 27 questões; pode ser apagada |
| Auth no servidor | OK | Identidade só pelo token (`server/auth.ts`); pagamentos confirmados pelo servidor |
| Segurança | OK (código e painéis) | Limite de chamadas no banco (migração 0012), teto diário de redação no PRO, CSP e cabeçalhos, teste que garante que HTML no texto do aluno ou da IA aparece como texto (relatório da redação), CAPTCHA Turnstile ligado no site e no Supabase, limites de login do Supabase (30 a cada 5 min por IP), confirmação de e-mail ligada, ranking só com o primeiro nome, Dependabot e `npm audit` no CI. Data API do Supabase desligada (0 schemas expostos): a chave pública não lê nenhuma tabela. Pendente (dono): backup (plano grátis não tem) e proteção contra senhas vazadas (plano pago). O que configurar e a ordem: `docs/seguranca.md` |
| RLS | OK | Ligado em todas as tabelas `v2`, sem políticas, e a chave pública sem acesso ao schema (acesso só pelo servidor). V1 (`public`): RLS em todas as tabelas; o ranking antigo (`leaderboard`) deixou de ser lido sem login. O site do V1 (projeto `missao-aprovacao` na Vercel) deve ser apagado; as tabelas do V1 têm só dados de teste e podem ser removidas depois |
| Estados de carregando, vazio e erro | Parcial | As telas do app tratam carregando e erro das chamadas; faltava a tela de erro geral (corrigido neste PR) |
| Responsividade | OK | Landing e app conferidos em 390, 1024 e 1440 px |
| Acessibilidade | Parcial | Rótulos e `aria-*` nas telas principais; falta uma revisão completa de teclado e contraste |
| Testes e CI | OK | vitest (servidor e telas, Postgres real no CI), typecheck, `check:api` e build no GitHub Actions |
| Ambiente do agente | Limitado | O registro do npm está bloqueado aqui: testes, typecheck e build são validados pelo CI do PR. Postgres local e Chromium disponíveis |
| Deploy | Pendente (dono) | A Vercel publica a branch `claude/youthful-ramanujan-4efsgw`; trocar a *Production Branch* para `main` |
