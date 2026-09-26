# Aprova Tico (Missão Aprendizado V2)

Estudo para concursos públicos em forma de aventura, com o Tico: trilha guiada
de questões no estilo das bancas, revisão de erros, missões diárias, ranking,
redação corrigida por IA e plano PRO pago pelo Mercado Pago.

## Rodar localmente

```bash
npm install
cp .env.example .env   # preencha (ver abaixo)
npm run dev            # http://localhost:5173 — app + rotas de api/
npm run ci             # o mesmo que o GitHub Actions roda
```

## Colocar no ar (Vercel + Supabase)

1. **Banco** — no Supabase, *SQL Editor*: rode cada arquivo de
   `supabase/migrations/` em ordem (`0001` … `0005`). Todos podem ser rodados
   de novo sem estragar nada. As tabelas ficam no schema `v2`, separadas do V1.
2. **Vercel** — importe o repositório (framework **Vite**, detectado sozinho).
3. **Variáveis** (*Settings → Environment Variables*), direto na Vercel,
   nunca no código nem em mensagens:

   | Variável | Para quê |
   |---|---|
   | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | login (mesmos valores do V1) |
   | `SQL_HOST`, `SQL_PORT` (6543), `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME` | Postgres pelo *Transaction pooler* |
   | `OPENAI_API_KEY` (e opcional `OPENAI_MODEL`) | correção de redação; sem a chave, a tela avisa que está desligada |
   | `MERCADOPAGO_ACCESS_TOKEN` | pagamentos; `TEST-…` abre o ambiente de testes, `APP_USR-…` cobra de verdade |
   | `MERCADOPAGO_WEBHOOK_SECRET` | confere a assinatura das notificações |
   | `APP_BASE_URL` | endereço público, ex.: `https://aprovatico.com.br` |

4. **Mercado Pago** — em *Suas integrações → sua aplicação → Webhooks*:
   URL `https://SEU_DOMINIO/api/pagamentos/webhook`, evento **Pagamentos**.
   Copie a *assinatura secreta* para `MERCADOPAGO_WEBHOOK_SECRET`.
5. **Supabase Auth** — *Authentication → URL Configuration → Redirect URLs*:
   adicione `https://SEU_DOMINIO/**` (Google, confirmação e troca de senha).
6. Antes de lançar: preencha `CONTACT_EMAIL` em `src/app/nav.ts` (aparece na
   página de privacidade).

## Como funciona

- **Trilha** (`content/`, `server/game.ts`): 10 capítulos alternando as
  disciplinas, 5 grátis. XP só no primeiro acerto de cada questão, +20 ao
  concluir a fase; 5 vidas no grátis (só a trilha gasta; 1 volta a cada 30 min);
  sequência de dias pelo horário de Brasília. Tudo decidido no servidor, com
  trava por aluno contra envios simultâneos; o gabarito só vai depois da resposta.
- **Redação** (`server/essay.ts`, `api/redacao.ts`): IA com JSON Schema estrito;
  notas e trechos citados conferidos antes de mostrar. Grátis: 1 correção a cada
  7 dias (vaga reservada antes de chamar a IA e devolvida se ela falhar).
- **PRO** (`server/payments.ts`): passe de 30 dias ou 1 ano, pagamento único.
  Só vale depois de consultado na API do Mercado Pago; o mesmo pagamento nunca
  soma dias duas vezes; estorno tira os dias.
- **Questões**: hoje todas são autorais, no estilo das bancas. Questões de
  provas oficiais só entram com a prova e o gabarito publicados em mãos
  (campos `fonte.tipo: 'oficial'`, banca, órgão, cargo e ano).

Regras do projeto: [CLAUDE.md](CLAUDE.md).
