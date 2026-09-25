# Revisão do Missão Aprovação

Base examinada: `main`, commit `84679d6` (merge do PR #13). Inspeção local em 20/09/2026, horário de Brasília. Esta revisão não inclui o PR #14 nem comprova o estado da produção.

## Resultado

O núcleo de interação das questões funciona na amostra testada, mas há defeitos importantes em assinatura, proteção do PRO, identidade, persistência e informação ao usuário. Não considero a versão revisada pronta para liberar cobrança sem resolver os itens P1.

P1 = corrigir antes de comercializar ou confiar em dados sincronizados. P2 = correção funcional/UX importante. P3 = manutenção.

## Problemas prioritários

### 1. P1 — Novo checkout pode impedir o cancelamento da assinatura original

`api/payments.js:44` cria uma assinatura a cada chamada; `src/db/queries.js:365` substitui a única assinatura vinculada ao usuário. Não verifica assinatura ativa nem reutiliza checkout pendente. `api/auth.js:159` cancela apenas o registro atual com status `authorized`.

Reprodução isolada: usuário com assinatura ativa → dois novos checkouts → registro atual vira `pending` → downgrade retorna sucesso sem chamar cancelamento do provedor. A assinatura original poderia continuar cobrando. Nenhuma transação real foi executada.

Correção: preservar histórico de assinaturas, impedir duplicação de contratação, reutilizar tentativa pendente e cancelar a assinatura faturável correta. Também restringir métodos: o handler de pagamento aceita GET e cria assinatura quando chamado diretamente, como pode ocorrer na rota por arquivo da Vercel.

### 2. P1 — Conteúdo anunciado como PRO está acessível gratuitamente

Reprodução no navegador: visitante → Aventura → capítulo 6, Caminhos da justiça → Primeiras descobertas. A questão abriu normalmente, sem checkout ou login.

`public/tico-plans.js:649` procura `.vlp-chapter-card` e `.vlp-phase-btn`; a tela examinada tinha zero elementos correspondentes. O bloqueio não é aplicado. Além disso, `getPlan()` aceita sinalização de PRO do armazenamento local. A API de redação verifica plano no servidor, mas isso não protege os capítulos entregues integralmente ao navegador.

Correção: definir a regra de acesso em uma fonte única, integrá-la ao componente real e aos outros caminhos de entrada, e decidir como entregar conteúdo pago com autorização no servidor.

### 3. P1 — Alterar apenas a banca apaga dados do perfil

`public/supabase-client.js:529` envia somente `preferredBanca`. `api/auth.js`, ação `update-profile`, preenche os demais campos ausentes com valores padrão. A reprodução mudou o nome para “Estudante Concurseiro”, apagou a bio e trocou a cidade por “Brasil”.

Correção: atualização parcial deve preservar campos ausentes; validar os campos enviados. Manter coerência entre `users` e `profiles`, hoje atualizados por caminhos diferentes.

### 4. P1 — Sincronização de cadastro pode retirar PRO e zerar XP

`api/auth.js`, ação `sync-profile`, envia `plan: 'free'`, `xp: 0` e `streak: 1` a `getOrCreateUser`. A implementação real faz atualização em conflito, em vez de apenas criar. Repetir a ação para uma conta existente sobrescreve os valores. Reproduzido com banco simulado.

Correção: separar criação de usuário de atualização de dados cadastrais; nunca redefinir plano ou progresso ao sincronizar cadastro.

### 5. P1 — XP e recompensas são controlados pelo cliente

`api/data.js:57` aceita XP, ofensiva e vidas do corpo da requisição. Reproduzido: XP 999999999 e vidas -50 foram aceitos. Autenticação impede alterar outro usuário, mas não impede inventar a própria pontuação e contaminar o ranking.

`public/supabase-client.js:473` e `:488` também calculam recompensas no cliente, sem resgate atômico no servidor; o baú volta com `bonusClaimed: false` na leitura.

Correção: servidor deve validar eventos e conceder recompensas uma única vez; adicionar limites e regras de integridade.

### 6. P1 — Limite semanal de redação falha com pedidos simultâneos

`api/redacao.js:492` conta avaliações antes da chamada à IA, mas não reserva a cota. Duas requisições concorrentes gratuitas passaram e acionaram duas correções simuladas. Além disso, em `:600`, o salvamento ocorre sem `await`; a resposta pode terminar antes da persistência, especialmente relevante em serverless.

Correção: reservar cota de forma atômica e persistir o resultado antes de finalizar a execução. Tratar falha, repetição e liberação de reserva explicitamente.

### 7. P1 — Progresso na nuvem não está conectado ao progresso do jogo

No frontend examinado não há chamada à ação `save-progress`. `syncMissionProgress()` grava missões diárias, enquanto `loadUserCloudProgress()` lê `user_progress`; o bundle não chama esta última função. `getUserDetailedProgress()` só conta fases quando recebe array, mas a coluna é texto JSON.

O jogo usa chaves globais `missao-aprovacao-v1` e `missao-redacao-v1`, sem UID; logout não as separa. Isso permite mistura de jornadas/rascunhos entre pessoas no mesmo navegador e não entrega a promessa de retomada entre dispositivos.

Correção: armazenamento por usuário, política explícita de migração do visitante e salvamento/restauração real de progresso, rascunhos e histórico. Validar com duas contas e dois dispositivos.

### 8. P1 — Sessão e cadastro têm caminhos de falha mal tratados

`public/supabase-client.js:253` aguarda hidratação dentro de `onAuthStateChange`; essa hidratação chama `getSession()` pelo `authFetch`. É o padrão de bloqueio descrito pela [documentação oficial do Supabase](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0). Risco identificado por inspeção e documentação; não reproduzido com login real nesta revisão.

Em `:646`, a presença de qualquer cache pula a restauração inicial; `public/tico-account-form.js` redireciona a partir do cache antes de confirmar a sessão. Cache antigo pode afastar a pessoa da tela de login mesmo com sessão inválida. Login/hidratação também não verificam `res.ok` antes de persistir um perfil padrão gratuito.

Correção: sessão validada antes de redirecionar, hidratação fora do callback de autenticação, tratamento explícito de falhas de perfil e atualização do plano pelo servidor.

## Problemas de interface e experiência

### 9. P2 — Perfil e ranking mostram sucesso inexistente

Sem credenciais configuradas, o navegador registrou `supabaseUrl is required`. Mesmo assim, Meu Perfil mostra “Sincronizado na nuvem” e o ranking mostra “Ao Vivo” e a posição #1 do visitante. Confirmado visualmente.

Fontes: `public/assets/index-Dl2uwfPA.js:608` e `:614`; composição do ranking a partir de `:306`; `public/supabase-client.js:419` também converte falha de ranking em lista vazia.

Correção: estados separados de visitante, carregando, sincronizado, pendente e erro. Não inventar posição quando a classificação não foi carregada. A falta de configuração é local; o defeito é a informação falsa apresentada nessa situação.

### 10. P2 — URLs diretas de seções não funcionam

`/redacao` respondeu HTTP 200, mas exibiu “Página não encontrada” no navegador. O roteador no final do bundle reconhece apenas `/`, `/jogar`, `/cadastro`, `/entrar` e `/privacidade`. As reescritas para `/missoes`, `/ranking` e `/dados` também não criam rotas React.

Correção: rotas reais para as seções ou redirecionamentos que selecionem a aba correta. Testar o conteúdo renderizado, além do status HTTP.

### 11. P2 — Cadastro comunica sucesso como erro e não oferece recuperação

`registerUser()` lança exceção com “Cadastro criado! Confirme seu e-mail”, e o formulário exibe toda exceção no alerta de erro. Não encontrei fluxo de “Esqueci minha senha”, embora a mensagem de e-mail duplicado recomende usá-lo.

Na tela de entrada persistem textos de prévia (“Este será o seu espaço…”) e a senha recebe placeholder de criação. Sem configuração, o botão fica repetindo “Ainda carregando”, mesmo depois de uma falha definitiva.

Correção: tela de confirmação enviada, reenvio com intervalo, recuperação de senha, mensagens específicas de indisponibilidade e validação antes do envio. Avaliar se WhatsApp e cidade precisam ser obrigatórios antes do primeiro treino.

### 12. P2 — Promessas e explicações se contradizem

A página `/privacidade` afirma que não cria contas nem mantém redações no servidor; o código implementa ambos. Cadastro menciona 21 fases, planos mencionam 111. O PRO promete “bancas oficiais”, enquanto a oficina informa rubrica geral que não reproduz correção oficial.

Correção: revisar os textos conforme o comportamento efetivo. Esta é uma constatação de inconsistência do produto, não uma análise jurídica do aviso de privacidade ou do conteúdo das questões.

### 13. P2 — Modal e navegação móvel precisam de ajustes

Em 390 × 844, o layout básico de cadastro e trilha coube na tela. Porém, há 11 opções no menu horizontal, com apenas parte delas imediatamente visível. O card gratuito ocupa quase toda a primeira tela do modal; o CTA do PRO vem abaixo. O foco não foi levado para dentro do diálogo ao abrir; não há contenção de foco no código. Após fechar, o conteúdo continuou na árvore de acessibilidade.

Correção: menu com prioridades claras e “Mais”, CTA acessível sem percorrer o card gratuito inteiro, foco inicial/restaurado, contenção no diálogo e remoção semântica quando fechado. A navegação por teclado merece uma rodada dedicada após a correção.

## Manutenção

### 14. P2 — Observador de DOM realimenta suas próprias alterações

`public/tico-plans.js:739` observa todos os filhos do documento e chama `updateUI()`. Essa função reescreve, entre outros elementos, `item.innerHTML` em `:587`, disparando novas mutações mesmo sem mudança de plano. O debounce por quadro não elimina o ciclo. Identificado no código; consumo de CPU/bateria não foi medido.

Correção: escritas idempotentes e observação restrita; idealmente mover o estado de conta/plano para componentes da aplicação.

### 15. P3 — Fonte de frontend e verificações precisam ser recuperadas

O frontend é um bundle alterado diretamente, com complementos que dependem da estrutura interna do HTML. Existem cópias na raiz e em `public/`; as cópias principais comparadas estavam iguais, mas exigem manutenção duplicada. `build` não recompila a interface. `test-curriculum.js:3` contém JavaScript inválido e não participa da suíte.

Correção: recuperar o projeto-fonte original e estabelecer build reproduzível, uma única pasta de publicação e testes dos fluxos essenciais. Não reconstruir toda a interface antes de corrigir os riscos de dados e pagamento.

## O que foi verificado

- 51 testes existentes passaram, com autenticação, banco e pagamento simulados.
- `audit/reproduce.mjs` reproduziu seis cenários defeituosos: pontuação inventada, perda de perfil, reset de PRO/XP, checkout/cancelamento, GET com efeito de pagamento e concorrência de redação. O script confirma defeitos; passar não significa que foram corrigidos.
- 48 arquivos JavaScript verificados sintaticamente: um erro em `test-curriculum.js`.
- Navegador: trilha, seleção/correção de uma questão, crédito de 10 XP, avanço, pausa e persistência após recarregar; ranking, missões, perfil, catálogo de jogos, cadastro/entrada, planos, capítulo 6, acesso direto à redação e privacidade.
- Desktop e viewport móvel 390 × 844. Layout e interações avaliados por amostragem, sem concluir todas as 111 fases ou todos os minijogos.
- Rotas locais principais devolveram HTML; Supabase e leaderboard devolveram 503 sem configuração. HTTP 200 não garantiu que a seção renderizasse corretamente.

## Ordem proposta para contas e pagamentos

1. Corrigir perda de perfil, reset de usuário, sessão e separação de armazenamento por conta.
2. Implementar confirmação de e-mail, recuperação de senha, erros claros e migração do visitante. Validar cadastro novo, e-mail existente, sessão expirada, Google e troca de conta.
3. Revisar a migração AbacatePay no PR #14 separadamente. Confirmar contrato real de API/webhook e modelo de assinaturas antes de integrar; os achados de Mercado Pago não provam como aquele PR se comporta.
4. Validar em ambiente de teste: checkout repetido, webhook repetido/atrasado, pagamento confirmado, falha, cancelamento, renovação e atualização do PRO em outra sessão. Evitar qualquer ativação só pelo retorno do checkout.
5. Corrigir acesso PRO, cota de IA, pontuação, sincronização e estados da interface; então refinar a navegação e os textos comerciais.

Não foram criadas contas reais, feitas cobranças, alteradas credenciais, migrado banco ou publicado código. As mudanças locais desta revisão são somente este relatório e o script de reprodução.
