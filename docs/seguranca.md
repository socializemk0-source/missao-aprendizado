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
| CAPTCHA | Cloudflare Turnstile no login, cadastro e "esqueci a senha", ligado pela variável `TURNSTILE_SITE_KEY` (ver abaixo) |
| Cabeçalhos | CSP restrita (só o próprio site, o Supabase e o CAPTCHA; sem `eval`; o script do tema entra por hash), HSTS, `X-Frame-Options: DENY` (o app não abre dentro de outro site), `nosniff`, Referrer-Policy, Permissions-Policy e COOP (`vercel.json`, conferido em `tests/server/headers.test.ts`) |
| Dados pessoais | O ranking mostra só o primeiro nome. Os logs de erro não levam nome, e-mail nem id (`server/log.ts`) |
| Excluir a conta (LGPD) | Perfil → Excluir minha conta (confirmação escrita). Apaga perfil, progresso, respostas, plano, redações, simulados, jogos, compras não pagas, contadores de limite e o e-mail da lista; depois remove o login no Supabase. Ficam só os registros de pagamento, exigidos por lei, sem nome nem e-mail (`server/conta.ts`) |
| Dependências | Dependabot abre PR quando sai correção; o CI roda `npm audit` e barra falha alta ou crítica nas dependências do app |

## O que configurar (dono do projeto)

### 1. CAPTCHA (Cloudflare Turnstile), nesta ordem
1. Em dash.cloudflare.com → Turnstile → *Add widget*: domínio do app (e `missao-aprendizado.vercel.app`), modo *Managed*. Anote a **Site Key** (pública) e a **Secret Key** (secreta).
2. Na Vercel, em *Settings → Environment Variables*, crie `TURNSTILE_SITE_KEY` com a Site Key e faça um novo deploy. A partir daí as telas mostram a verificação.
3. Só depois, no Supabase, vá em *Authentication → Attack Protection → Enable CAPTCHA protection*, escolha *Turnstile* e cole a **Secret Key**.

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
