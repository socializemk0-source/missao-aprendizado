# Status do Aprova Tico

Leia este arquivo no começo de cada sessão, em vez de refazer o diagnóstico.
Atualize a linha da funcionalidade em todo PR que mexer nela.

Última atualização: 29/09/2026 (Marco 0, diagnóstico feito em cima da `main` 4943aa0).

Legenda: **OK** = funcionando · **Parcial** = existe, mas falta parte · **Ausente** = não existe.
Prioridade: P0 bloqueia o uso · P1 jornada principal · P2 medição e retenção · P3 operação.

## Funcionalidades

| Funcionalidade | Estado | Situação | Problema | Prioridade | Próxima ação |
|---|---|---|---|---|---|
| Landing | Hero com a ilustração nova, questão de demonstração sem cadastro, planos, perguntas, captura de e-mail | OK | — | — | — |
| Cadastro, login e senha | E-mail/senha e Google pelo Supabase; "Esqueci minha senha" e `/redefinir-senha` | OK | As URLs de retorno das prévias da Vercel precisam estar liberadas no Supabase | P1 | Conferir *Redirect URLs* no Supabase (pedido ao dono) |
| Rotas e menu | 12 itens no menu, `/fase/:id`, `/praticar/:disciplina`, `/redacao/:id`, `/simulado/:id`, 404 em português | OK | Antes deste PR, uma tela quebrada mostrava a página de erro do React Router, em inglês | P0 | Corrigido: tela "Algo deu errado nesta tela" |
| Onboarding | — | Ausente | O aluno cai direto na trilha, sem informar prova, banca, data, horas por dia e nível | P1 | Marco 1 |
| Painel "o que estudar hoje" | A tela inicial é a Trilha | Ausente | Não responde "o que estudo hoje, como estou, onde erro, quanto falta" | P1 | Marco 1 |
| Plano de estudos | — | Ausente | Não há plano nem recálculo pelo desempenho | P1 | Marco 1 |
| Trilha (capítulos e fases) | 6 disciplinas, fases com vidas, XP e bônus de fase; parte dos capítulos é PRO | OK | — | — | — |
| Questões da trilha | 96 questões autorais em `content/questoes/*.ts` (16 por arquivo), com explicação | OK | Direito ainda não passou por revisão de professor | P1 | Revisão por professor (conteúdo do dono) |
| Banco de questões (`v2.questions`) | Catálogo 5 min em memória; só `status = 'ativa'` chega ao aluno. 327 questões autorais em `revisao`: 27 do PR #5 (migração 0007) e o piloto de 300 (150 de Português e 150 de RLM, 10 por assunto, migração 0008), conferidas por resolução às cegas | Parcial | Nenhuma questão do banco foi revisada por professor; não há tela para revisar | P1 | Professor revisa uma amostra do piloto; se a taxa de correção for baixa, escalar para as outras matérias. Tela de revisão para professores |
| Correção com explicação | Servidor confere a resposta e devolve gabarito e explicação | OK | — | — | — |
| Caderno de erros / revisão | `/revisar`: fila das questões erradas | Parcial | Sem espaçamento (hoje, amanhã, 7 e 30 dias) | P1 | Marco 1: revisão espaçada |
| Domínio por assunto | Acertos por disciplina em `/disciplinas` | Parcial | Não há score por assunto (acerto, dificuldade, recência, repetição) | P1 | Marco 1 |
| Simulados | Fácil, médio, difícil e misto; por disciplina e estilo de banca; cronômetro opcional; resultado; erros vão para a revisão; grátis: 1 por dia | Parcial | Faltam marcar questão, confirmação de entrega, resultado por assunto e plano de revisão | P2 | Marco 2 |
| Filtros de questões | Prática por disciplina | Parcial | Faltam assunto, dificuldade, erradas, não respondidas, favoritas | P2 | Marco 2 |
| Progresso | XP, sequência, vidas, missões diárias, conquistas, ranking | OK | Não há visão semanal/mensal | P2 | Marco 2 |
| Redação com IA | OpenAI no servidor; nota por critério; grátis: 1 correção a cada 7 dias | OK | Sem `OPENAI_API_KEY` a correção fica desligada (com aviso) | — | — |
| Pagamentos (PRO) | Checkout Pro do Mercado Pago, 30 dias ou 1 ano, webhook com assinatura, confirmação na volta, compras registradas (`v2.checkouts`, migração 0009) e botão "Verificar meu pagamento" quando o aviso não chega | Parcial | Credenciais e webhook ainda não configurados no Mercado Pago e na Vercel. Falta cupom | P0 | Dono segue `docs/mercado-pago.md` (teste na prévia, depois produção). Cupom no Marco 4 |
| Perfil | Nome, plano e progresso | Parcial | Não há exclusão de conta | P3 | Marco 4 |
| Tutor IA | — | Ausente | — | P2 | Marco 3 |
| Notificações no app | — | Ausente | — | P2 | Marco 3 |
| Analytics (`v2.events`) | — | Ausente | — | P2 | Marco 2 |
| Admin | — | Ausente | Questões só mudam de status direto no banco | P3 | Marco 4 |
| Termos, privacidade, SEO, PWA | `/privacidade` e meta description | Parcial | Faltam termos de uso, manifest/PWA e imagem de compartilhamento | P3 | Marco 4 |

## Base técnica

| Item | Situação | Observação |
|---|---|---|
| Banco | OK | Migrações 0001–0006 aplicadas em produção (13 tabelas em `v2`). A 0007 (este PR) precisa ser aplicada pelo dono. `v2.questoes_proprias` é a cópia antiga das 27 questões; pode ser apagada depois que a 0007 for aplicada |
| Auth no servidor | OK | Identidade só pelo token (`server/auth.ts`); pagamentos confirmados pelo servidor |
| RLS | OK | Ligado em todas as tabelas `v2` (acesso só pelo servidor) |
| Estados de carregando, vazio e erro | Parcial | As telas do app tratam carregando e erro das chamadas; faltava a tela de erro geral (corrigido neste PR) |
| Responsividade | OK | Landing e app conferidos em 390, 1024 e 1440 px |
| Acessibilidade | Parcial | Rótulos e `aria-*` nas telas principais; falta uma revisão completa de teclado e contraste |
| Testes e CI | OK | vitest (servidor e telas, Postgres real no CI), typecheck, `check:api` e build no GitHub Actions |
| Ambiente do agente | Limitado | O registro do npm está bloqueado aqui: testes, typecheck e build são validados pelo CI do PR. Postgres local e Chromium disponíveis |
| Deploy | Pendente (dono) | A Vercel publica a branch `claude/v2-improbidade`; trocar a *Production Branch* para `main` |
