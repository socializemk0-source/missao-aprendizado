# Segurança do Aprova Tico

O que o código já faz e o que precisa ser configurado nos painéis. Leia
antes de lançar e antes de um teste de invasão (pentest).

## O que o código já garante

| Área | Como |
|---|---|
| Segredos | Nenhuma chave no código nem no histórico do git (conferido em todas as branches). Chaves só nas variáveis de ambiente da Vercel. O navegador recebe só a URL do Supabase, a chave `anon` e a chave pública do CAPTCHA, que foram feitas para serem públicas |
| Quem é o aluno | Só pelo token do Supabase (`server/auth.ts`), conferido no servidor do Supabase a cada pedido. Nenhuma rota aceita id de usuário vindo da tela |
| Dados de cada aluno | Toda consulta filtra pelo aluno do token; redação, simulado, jogo e pagamento de outro aluno respondem "não encontrado". RLS ligado em todas as tabelas `v2` (a chave pública não lê nada) |
| SQL | Todas as consultas passam pelo Drizzle com parâmetros (sem SQL montado com texto do aluno) |
| HTML | O React escapa tudo; não há `innerHTML`. A CSP bloqueia script de fora (conferido no Chromium) |
| Senhas | Não guardamos senha: o Supabase Auth guarda com bcrypt e cuida da recuperação de senha |
| Pagamentos | Cartão e PIX ficam no Mercado Pago. Webhook com assinatura conferida em tempo constante; o pagamento é consultado na API do Mercado Pago (valor e moeda conferidos); aplicar duas vezes não soma duas vezes. O endereço de volta vem da configuração ou da Vercel, nunca do cabeçalho do pedido |
| Abuso e robôs | Limite de chamadas contado no banco (`server/limite.ts`, migração 0012), válido entre todas as instâncias: 600 por minuto por IP antes do login, e por aluno: jogo 120, perfil 30, pagamentos 20, redação 30 por minuto. Formulário de contato: 5 por minuto por IP, com campo-isca para robô. Se o contador falhar, o app segue funcionando |
| Custo da IA | Correção de redação: grátis 1 a cada 7 dias; PRO até 20 a cada 24 horas e 5 por minuto |
| CAPTCHA | Cloudflare Turnstile, ligado pela variável `TURNSTILE_SITE_KEY` (ver abaixo). Login: conferido pelo Supabase. Cadastro e "esqueci a senha" (`/api/auth`), lista de contatos (`/api/leads`) e toda escrita do jogo (`/api/game`, header `X-Turnstile-Token`, token invisível pedido em segundo plano): conferidos no servidor por `server/turnstile.ts` — success, site aprovado (`aprovatico.com.br`, `www`, e só nas prévias o endereço da própria prévia), formulário (`signup`, `recover`, `lead`, `game`), 3 s de limite, sem resposta da Cloudflare = bloqueia, token usado uma vez, log só `{ok, hostname, action}` |
| Cabeçalhos | CSP restrita (só o próprio site, o Supabase, o CAPTCHA e o pixel da Meta, que pode enviar formulário e abrir moldura só em `www.facebook.com`; os servidores de nuvem que o pixel tenta usar, `…on.aws` e `…run.app`, ficam bloqueados de propósito e aparecem como erro no console; sem `eval`; o script do tema entra por hash), HSTS, `X-Frame-Options: DENY` (o app não abre dentro de outro site), `nosniff`, Referrer-Policy, Permissions-Policy e COOP (`vercel.json`, conferido em `tests/server/headers.test.ts`) |
| CORS | A API só libera leitura para `https://www.aprovatico.com.br` (`vercel.json`); o app chama a API do mesmo endereço, então prévias e o domínio sem `www` seguem funcionando. Sem `Access-Control-Allow-Credentials` |
| Nome do aluno | Só letras, números, espaço e `. ' ’ - _ ( )` (`shared/nome.ts`, conferido no servidor). Cidade, concurso e banca não aceitam `<` e `>`. O nome vindo do Google e nomes antigos passam pelo mesmo filtro antes de aparecer no ranking |
| Dados pessoais | O ranking mostra só o primeiro nome. Os logs de erro não levam nome, e-mail nem id (`server/log.ts`) |
| Excluir a conta (LGPD) | Perfil → Excluir minha conta (confirmação escrita). Apaga perfil, progresso, respostas, plano, redações, simulados, jogos, compras não pagas, contadores de limite e o e-mail da lista; depois remove o login no Supabase. Ficam só os registros de pagamento, exigidos por lei, sem nome nem e-mail (`server/conta.ts`) |
| Dependências | Dependabot abre PR quando sai correção; o CI roda `npm audit` e barra falha alta ou crítica nas dependências do app |

## O que configurar (dono do projeto)

### 1. CAPTCHA (Cloudflare Turnstile), nesta ordem
1. Em dash.cloudflare.com → Turnstile → *Add widget*: domínio do app (e `missao-aprendizado.vercel.app`), modo *Managed*. Anote a **Site Key** (pública) e a **Secret Key** (secreta).
2. Na Vercel, em *Settings → Environment Variables*, crie `TURNSTILE_SITE_KEY` com a Site Key e faça um novo deploy. A partir daí as telas mostram a verificação.
3. Só depois, no Supabase, vá em *Authentication → Attack Protection → Enable CAPTCHA protection*, escolha *Turnstile* e cole a **Secret Key**.
4. Na Vercel, crie também `TURNSTILE_SECRET_KEY` com a mesma **Secret Key** (Production e Preview, nunca exposta ao navegador) e confira que `SUPABASE_SERVICE_ROLE_KEY` existe. Só então faça o deploy. **Sem elas, em produção, cadastro, "esqueci a senha", lista de contatos e as respostas do jogo são recusados** (falha fechada). Se o app ganhar outro domínio, liste-o em `TURNSTILE_HOSTNAMES` e no widget da Cloudflare (as prévias da Vercel também precisam estar no widget para o CAPTCHA aparecer nelas).
5. No Supabase, *Authentication → Rate Limits*: o cadastro e o "esqueci a senha" agora chegam ao Supabase pelos servidores da Vercel (poucos IPs). Suba o limite por IP de cadastro/recuperação para não barrar alunos de verdade — o limite por aluno fica no nosso servidor (10 por hora por IP real e 3 por hora por e-mail).

Se fizer o passo 3 antes do 2, ninguém consegue entrar até o passo 2 ser feito.

### 2. Supabase
- *Authentication → Attack Protection*: CAPTCHA (acima); deixe a proteção contra senhas vazadas ligada, se o plano permitir.
- *Authentication → Providers → Email*: **confirmação de e-mail ligada**; senha com no mínimo 8 caracteres.
- *Authentication → Emails → SMTP Settings*: **SMTP próprio** (Resend ou Brevo). O envio padrão do Supabase manda pouquíssimos e-mails por hora; sem SMTP próprio, cadastro e "esqueci a senha" falham com alunos de verdade.
- *Authentication → URL Configuration*: Site URL com o domínio, e as Redirect URLs (`https://SEU_DOMINIO/**`).
- *Advisors → Security Advisor*: rodar e corrigir o que aparecer, **principalmente nas tabelas do V1 (schema `public`)**, que continuam no mesmo projeto e não passam por este código. Ao lançar o V2, desligar o V1.
- Backups: o plano grátis não tem. Backup semanal criptografado pelo GitHub Actions (`docs/backup.md`); o Pro do Supabase faz backup diário.
- Certificado do banco: em *Project Settings → Database → SSL Configuration*, baixe o certificado e cole o conteúdo na variável `SQL_CA_CERT` da Vercel. Com ele, o servidor confere que está falando com o banco certo.

### 3. Vercel
- *Production Branch* = `main`.
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase → *Project Settings → API → service_role*): necessária para o aluno excluir a própria conta. É a chave mais poderosa do projeto: só na Vercel, nunca em código nem no navegador.
- `APP_BASE_URL` com o domínio final (`https://...`).
- *Firewall*: deixe a proteção contra DDoS (já vem ligada); em ataque, ligue o *Attack Challenge Mode*. Se o plano permitir, crie uma regra de *Rate Limit* para `/api/*` por IP; ela barra o excesso antes de chegar ao código.
- Plano Pro antes de cobrar (o Hobby é só para uso não comercial).

### 4. GitHub
- Tornar o repositório **privado** (*Settings → General → Danger Zone*). Não há segredo nele, mas o banco de questões com gabarito é o produto.
- Ligar *Settings → Code security → Secret scanning* e *Dependabot alerts*.

### 5. Termos e contato
- Preencher `CONTACT_EMAIL` em `src/app/nav.ts` (e-mail de contato para privacidade, reembolso e erros).
- Pedir a um advogado que revise `/termos` e `/privacidade` antes de cobrar.

### 6. OpenAI e Mercado Pago
- OpenAI: limite de gasto mensal no painel (*Settings → Limits*).
- Mercado Pago: credenciais e webhook conforme `docs/mercado-pago.md`. A chave secreta do webhook fica só na Vercel.

## Antes do pentest
- Faça o teste numa **cópia**: prévia da Vercel apontando para um projeto Supabase separado, sem dados de alunos reais.
- Dê ao testador autorização por escrito, com o escopo (domínio da prévia, `/api/*`), as datas e o que não pode (ataque de volume contra a Vercel ou o Supabase de produção).
- Conte o que esperar: 429 nos limites acima, 401 sem login, 404 para dados de outro aluno, CSP e os cabeçalhos acima.

## Pentest de 07/10/2026 (produção)

Nenhum achado crítico ou alto. O que já estava contido foi provado ao vivo:
missão resgatada duas vezes (1×200 e 4×409), XP repetido (0 na segunda vez),
webhook sem assinatura (401), limite de chamadas (429), professor × aluno
(403 nos dois sentidos) e campos extras no perfil (400).

| Achado | O que foi feito |
|---|---|
| VULN-001 CORS `*` | Corrigido: a API responde `Access-Control-Allow-Origin` só com o domínio do app (teste em `tests/server/headers.test.ts`). O token vai no cabeçalho `Authorization`, nunca em cookie, então outro site já não tinha como usá-lo |
| VULN-012/028 Nome com HTML no ranking | Corrigido: o servidor recusa `<`, `>`, aspas e símbolos no nome; o ranking limpa nomes antigos. O React já escapava o texto (não há `innerHTML`) e a CSP bloqueia script de fora, então o `alert` nunca rodou. O ranking já mostrava só o primeiro nome |
| VULN-006 Cache do HTML | Corrigido: a página do app vai com `Cache-Control: public, max-age=0, must-revalidate`; a Vercel também troca o cache a cada deploy. Os arquivos de `/assets/` têm nome com hash e continuam em cache longo |
| VULN-023 Webhook no formato antigo | Continua ignorado (o mesmo pagamento chega pelo aviso assinado), agora com aviso no log da Vercel: `[webhook] aviso no formato antigo ignorado`. Se só esse aparecer, o aviso assinado não está ligado no painel do Mercado Pago (`docs/mercado-pago.md`) |
| VULN-014 `plan` vindo da tela | Sem mudança: o plano é sempre lido do banco (`proUntil`) a cada pedido; nenhum pedido aceita `plan` (PATCH com `plan` → 400, teste em `tests/server/me.test.ts`) |
| VULN-003 Chave `anon` no site | Por design: é pública. A Data API está desligada (0 schemas expostos), então ela não lê nenhuma tabela |
| VULN-009 `/auth/v1/settings` público | Por design do Supabase (diz só quais logins existem) |
| VULN-005 `www` com dois IPs | Normal: são da Vercel |
| VULN-011 Dados pessoais no token | O token é do Supabase (e-mail, nome e foto do Google). Ele só vai no cabeçalho para o nosso servidor e para o Supabase, e os logs não guardam cabeçalhos nem dados pessoais (`server/log.ts`). Tirar esses dados exigiria um *Custom Access Token Hook* no Supabase; fica como melhoria futura |
| VULN-025 Professor no ranking | Por design: o professor também é aluno. Se incomodar, excluir os e-mails de `v2.revisores` do ranking |
| VULN-026 Professor pelo e-mail | Por design: o e-mail vem do token conferido pelo Supabase, com confirmação de e-mail ligada. Quem tem o e-mail do professor é o professor |

O que o dono confere nos painéis:

1. **Google Cloud (VULN-008)**: *APIs e serviços → Credenciais → o ID do cliente OAuth → URIs de redirecionamento autorizados*. Com o login pelo Supabase, deve haver só `https://qxhjhkzpuysajuvmtwou.supabase.co/auth/v1/callback` (sem `*`, sem `http://`). Em *Origens JavaScript autorizadas*, só `https://www.aprovatico.com.br` e `https://aprovatico.com.br`.
2. **Supabase → Authentication → URL Configuration**: Site URL `https://www.aprovatico.com.br`; Redirect URLs só com os domínios do app (e as prévias da Vercel do próprio projeto), sem `*` solto.
3. **Supabase → Project Settings → JWT Keys (VULN-027)**: um token de outra sessão foi recusado com "assinatura inválida". Conferir se houve troca de chave: a chave em uso e a anterior devem aparecer em `https://qxhjhkzpuysajuvmtwou.supabase.co/auth/v1/.well-known/jwks.json` durante a troca. Se a chave foi trocada de propósito, é esperado que logins antigos precisem entrar de novo; se ninguém trocou, o token não era deste projeto.


## Dono de cada recurso (auditoria de 08/10/2026)

As Functions falam com o Postgres pela conexão do dono das tabelas
(`SQL_USER`, `server/db.ts`). Ela **não passa pela RLS** (como a service_role)
e não carrega o JWT do aluno — `auth.uid()` não existe ali. Por isso o filtro
de dono é **explícito no código**, sempre com o id do token.

| Rota | Id que vem da tela | Onde o dono é conferido | De outra conta |
|---|---|---|---|
| `/api/me` GET/PATCH/DELETE | nenhum (`userId` no corpo → 400 "campo não editável"; na URL, ignorado) | `profiles.user_id = <token>`; exclusão: cada `DELETE ... where user_id = <token>` e e-mail do token (`server/conta.ts`) | — |
| `/api/game` `simulado`, `simulado-entregar` | `id` (uuid) | `simulados.id = :id and user_id = <token>` (`server/game-pg.ts`) | 404 `SIMULADO_INEXISTENTE` |
| `/api/game` `jogo-jogada`, `jogo-terminar` | `id` (uuid) | `game_rounds.id = :id and user_id = <token>` | 404 `JOGO_INEXISTENTE` |
| `/api/game` `responder` | `questionId` | questão é pública (só `status = 'ativa'`); o que se grava (`question_state`, `answers`, `user_stats`) leva `user_id = <token>` | — |
| `/api/game` `resgatar` | `missionId` (lista fixa) | `mission_claims.user_id = <token>` | — |
| `/api/game` `fase`, `pratica` | id de fase/matéria (lista fixa do conteúdo) | progresso lido por `user_id = <token>` | — |
| `/api/game` todo POST | `Idempotency-Key` | `idempotency_keys (user_id, key)` com `user_id = <token>` | a chave de outra conta não devolve a resposta dela |

Não há `org_id`, `attempt_id` nem `essay_id` nessas duas rotas (a redação
está em `/api/redacao`, que também filtra por `user_id`).

**service_role**: um único uso, `supabaseRemoverLogin` (`server/conta.ts`),
chamado só pelo `DELETE /api/me` com o id do token verificado, conferido como
uuid antes de chamar `/auth/v1/admin/users/<id>`. **Chave anon** no servidor:
só `auth.getUser(token)` (`server/supabase.ts`), que não lê tabela.

**Acesso direto (PostgREST)**: RLS ligada em todas as tabelas `v2`, sem
nenhuma política, e a migração 0016 tira de `anon` e `authenticated` qualquer
permissão no schema. `tests/server/rls-postgrest.pg.test.ts` sobe um
PostgREST de verdade no CI e tenta, com a chave pública e o JWT do aluno A,
ler/criar/alterar/apagar o que é do aluno B em todas as tabelas — no pior caso
(GRANT de tudo) e no padrão.

Para conferir **em produção** (só leituras), com o JWT de um aluno de teste A
e o id de um aluno de teste B:

```bash
RLS_REST_URL=https://qxhjhkzpuysajuvmtwou.supabase.co RLS_ANON_KEY=<chave anon> \
RLS_JWT_A=<access_token do aluno A> RLS_USER_B=<id do aluno B> \
npx vitest run tests/server/rls-postgrest.pg.test.ts
```

Com a Data API desligada, todas as respostas são recusa — o teste passa.

## Lista de contatos (`/api/leads`) e dados que vão para CRM/e-mail/painel

Texto vindo de fora (hoje, o nome na lista de contatos) é limpo ao gravar
(`textoLimpo` em `server/sanitize.ts`: sem sinais de HTML, caracteres de
controle ou de direção, nem começo de fórmula de planilha). Qualquer e-mail,
painel ou exportação que montar HTML com esses dados passa cada valor por
`escapeHtml` — nunca concatena texto cru. O e-mail só entra se tiver formato
válido (zod), em minúsculas.

## Cabeçalhos e CORS da API (`server/seguranca.ts`)

Toda rota de `api/` exporta `comSeguranca(handler, { metodos, headers })`
(um teste falha se alguma ficar de fora). A camada põe, em toda resposta —
sucesso, 4xx, 5xx e erro não tratado — CSP (`default-src 'none'`), HSTS,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, COOP e `Cache-Control: no-store` (só
`/api/config/supabase` troca para `public, max-age=300,
stale-while-revalidate=60` quando dá certo). O `vercel.json` repete os mesmos
cabeçalhos para `/api` (vale para erro da própria Vercel); um teste garante
que são iguais.

CORS: só `https://aprovatico.com.br`, `https://www.aprovatico.com.br` e, nas
prévias, o endereço da própria prévia. A resposta devolve a origem do pedido
(nunca `*`) e nunca `Access-Control-Allow-Credentials` (o login vai no header
`Authorization`). Origem de fora → 403. A própria página (mesmo host) passa
sem CORS. Sem `Origin` (servidor, como o webhook do Mercado Pago) segue; o
webhook nunca libera CORS. Preflight: só os métodos e headers da rota,
`Access-Control-Max-Age: 86400`.

## Cache e versão do app

- Página (`/`, rotas do app, `/index.html`): `public, max-age=0,
  must-revalidate`. O `Age` alto que aparece na resposta é da CDN da Vercel,
  que guarda a cópia do deploy atual e a descarta a cada deploy novo; o
  navegador revalida (ETag) a cada acesso. O `index.html` leva
  `<meta name="app-version">` com o commit, então o HTML (e o ETag) mudam a
  cada deploy de código novo.
- `/assets/*` (nomes com hash do Vite): `public, max-age=31536000, immutable`.
  Fora do rewrite do app: arquivo antigo dá 404, não a página.
- Versão: `VERCEL_GIT_COMMIT_SHA` (12 caracteres) embutida no bundle e
  devolvida em `/api/config/supabase` (`version`). Na Vercel, as variáveis de
  sistema precisam estar expostas (*Settings → Environment Variables →
  Automatically expose System Environment Variables*, ligado por padrão).
- Falha de import dinâmico (tela de um deploy anterior) → recarrega a página
  uma vez (trava por motivo no `sessionStorage`; sem ele, não recarrega).
  Versão diferente sem falha não recarrega.

## Chaves do Supabase: onde ficam e como trocar

| Chave | Onde fica | Quem usa | Pode ir ao navegador? |
|---|---|---|---|
| `SUPABASE_ANON_KEY` (pública; hoje a `anon` antiga, JWT com validade até 2037) | Vercel → *Settings → Environment Variables* (Production e Preview) | `/api/config/supabase` a entrega ao navegador; `server/supabase.ts` confere o token do aluno | Sim, é feita para isso. Não está no bundle: vem da API |
| `SUPABASE_SERVICE_ROLE_KEY` (secreta; hoje a `service_role` antiga, JWT) | Vercel, mesma tela | Só Functions: `/api/auth` (cadastro e senha) e exclusão de conta (`server/conta.ts`) | **Nunca** |
| Senha do banco (`SQL_PASSWORD`) e `SUPABASE_DB_URL` | Vercel / *GitHub → Settings → Secrets* (backup) | Servidor e backup | **Nunca** |
| `TURNSTILE_SECRET_KEY`, `MERCADOPAGO_*`, `OPENAI_API_KEY` | Vercel | Servidor | **Nunca** |

O CI confere a cada PR que nenhuma delas chega ao `dist/` (`npm run
check:bundle`: build com valores "canário" nas variáveis secretas e busca
por formatos de chave).

**As chaves antigas (`anon` e `service_role`, JWT) não vencem antes de 2037
nem trocam sozinhas, e não dá para trocar só uma** (o Supabase descontinuou
a rotação delas). O caminho é migrar para as chaves novas, que se trocam uma a
uma, sem derrubar ninguém:

1. Supabase → *Project Settings → API Keys*: criar uma **publishable key**
   (`sb_publishable_…`) e uma **secret key** (`sb_secret_…`). As antigas
   continuam valendo até serem desligadas.
2. Vercel, **só em Preview** primeiro: `SUPABASE_ANON_KEY` = publishable e
   `SUPABASE_SERVICE_ROLE_KEY` = secret. Novo deploy de prévia.
3. Na prévia, testar: entrar com senha e com Google, criar conta (`/api/auth`),
   "esqueci a senha" e excluir uma conta de teste (Perfil). O servidor manda a
   chave secreta nova só no header `apikey` (`cabecalhosAdmin` em
   `server/conta.ts`): a chave nova não é JWT e o Supabase a recusa em
   `Authorization`.
4. Deu certo: as mesmas duas variáveis em Production e novo deploy.
5. Supabase → *API Keys*: **desativar as chaves antigas** (dá para reativar
   se algo quebrar). Conferir de novo o passo 3 em produção.
6. Vazou uma chave nova? Criar outra secret key, trocar na Vercel, deploy, e
   só então apagar a vazada (apagar não tem volta).

## RLS e permissões do banco (auditoria de 08/10/2026)

Em produção (consulta de permissões): `anon` e `authenticated` **sem
nenhuma permissão no `v2`**; no `public` (V1), `anon` com todas as
permissões nas 10 tabelas antigas (inclusive `TRUNCATE`, que a RLS não
segura) e duas tabelas criadas só no dashboard (`practice_backups`,
`user_settings`). A Data API está desligada, então nada disso é alcançável
pela chave pública hoje — as migrações abaixo fecham também para o dia em que
ela for ligada.

- `v2` — migração `0017_v2_politicas_explicitas.sql`: em cada tabela, RLS
  ligada e quatro políticas **restritivas** `false` (SELECT, INSERT, UPDATE,
  DELETE) para `anon` e `authenticated`; apaga políticas criadas fora das
  migrações. Só o servidor acessa o `v2`.
- `public` (V1) — migração `20261008000000_public_somente_dono_leitura.sql`
  no repositório `missao-aprovacao`: RLS em todas as tabelas (inclusive as do
  dashboard), apaga todas as políticas antigas (como a leitura pública do
  `leaderboard`), tira tudo de `anon`, deixa `authenticated` só lendo os
  próprios dados (SELECT por dono) e nega INSERT/UPDATE/DELETE explicitamente;
  tira o EXECUTE das funções do `public` de `anon`.

Política nova se cria **só por migração** (nunca no dashboard): as duas
migrações apagam qualquer política que não seja a delas ao rodar de novo.

## Erros 5xx e requestId

Toda resposta da API tem o header `X-Request-Id`. Erro 5xx sai sempre como
`{ error: mensagem amigável, code: "codigo", requestId }` (`server/seguranca.ts`):
mensagem com cara de detalhe técnico (stack, SQL, nome de tabela, driver) é
trocada pela genérica. O detalhe vai só para o log da Vercel, com o mesmo id na
frente da linha (`[req:<id>]`, `log` em `server/log.ts`); do stack, só as linhas
`at …` (a primeira repete a mensagem, que no Drizzle traz os parâmetros).
Para investigar: pegue o `requestId` que o aluno viu e procure no log.

## Varredura de segredos no histórico (08/10/2026)

gitleaks 8.21.2 e trufflehog 3.88.0 (os dois conferidos com uma chave
plantada), mais busca direta por `service_role`, Stripe (`sk_live_`,
`whsec_`…), OpenAI (`sk-…`), `sb_secret_`, Mercado Pago, Resend, Turnstile e
URL de banco com senha, em **todos os commits de todas as branches** dos dois
repositórios.

- **`missao-aprendizado`**: nada real. Só os dois valores falsos dos testes
  (liberados em `.gitleaks.toml`) e a palavra "service_role" em comentários e
  documentação. O CI roda o gitleaks no histórico inteiro a cada PR.
- **`missao-aprovacao`** (V1), commit `a624e50` de 17/09/2026 ("Add files via
  upload"), já tirado do código em `023085a`/`4704f5e`, mas ainda no histórico:
  - chave **`anon`** (pública, não `service_role`) de **outro** projeto
    Supabase (`sqegkravlu3eplqaxupljd`, não o de produção), validade 2035;
  - chave web do Firebase/Google (`AIza…`) do projeto
    `watchful-mote-s3skh`.
  Nenhuma `service_role`, chave de IA, Stripe ou senha de banco apareceu.
  Ações recomendadas (dono): se o projeto Supabase `sqegkravlu3eplqaxupljd`
  não é usado, apagá-lo; no Google Cloud do projeto `watchful-mote-s3skh`,
  apagar a chave (ou o projeto, já que o Firebase saiu do app) ou, no mínimo,
  restringi-la por site e por API.
