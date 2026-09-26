# Missão Aprendizado V2 — regras do projeto

App de estudo para concursos públicos em forma de aventura (mascote: Tico).
Front em React + Vite + TypeScript (`src/`), API em funções da Vercel (`api/`),
lógica de servidor compartilhada em `server/`, banco Postgres do Supabase.

## Regras que não se quebram

1. **Só código-fonte no repositório.** Nunca subir build compilado (`dist/`,
   `assets/index-*.js`) nem ZIP de outra ferramenta. A Vercel faz o build.
2. **O servidor decide.** Quem é o usuário vem só do token (`server/auth.ts`),
   nunca de id no corpo/URL. PRO, XP, limites e pagamentos são decididos e
   gravados no servidor; a tela só mostra.
3. **Schema `v2`.** O V1 continua no ar no mesmo projeto Supabase (schema
   `public`). Tudo do V2 fica em `v2.*`. Toda mudança de tabela vem com uma
   migração idempotente em `supabase/migrations/` (numerada, `IF NOT EXISTS`).
4. **Imports com `.js`** em `api/` e `server/` (ex.: `'../server/auth.js'`).
   Sem isso a função quebra na Vercel com `ERR_MODULE_NOT_FOUND`.
   `npm run check:api` confere isso.
5. **Teste antes de corrigir/criar**: escreva o teste que falha, depois o
   código. `npm run ci` precisa passar antes de qualquer push.
6. **Conteúdo com origem limpa.** Questões são autorais (`fonte.tipo:
   'autoral'`) ou de provas oficiais conferidas com a prova e o gabarito
   publicados (`'oficial'`, com banca, ano, órgão, cargo). Nunca atribuir a
   uma banca uma questão que não saiu da prova dela. Explicações são nossas.
   Nunca copiar comentários, explicações ou o banco organizado de sites como
   TecConcursos, QConcursos etc. (direitos autorais e termos de uso).
7. **Textos em português**, claros, sem jargão técnico para o aluno.

## Comandos

- `npm run dev` — app + API local (lê `.env`, ver `.env.example`)
- `npm test` — testes (servidor e telas)
- `PG_TEST=1 SQL_SSL=false SQL_HOST=... npm test` — inclui testes com Postgres real
- `npm run ci` — tudo que o GitHub Actions roda

## Estrutura

- `src/app/` rotas e menu · `src/auth/` login · `src/pages/` telas ·
  `src/game/` progresso e sessão de questões · `src/layouts/` moldura do app ·
  `src/lib/` cliente Supabase, `api()` e clientes de cada rota
- `content/` questões, trilha e temas de redação · `shared/` tipos usados
  pelo servidor e pelas telas
- `api/` uma função por rota (plano Hobby da Vercel: no máximo 12) ·
  `server/` auth, banco, regras (cada store tem versão Postgres e em memória)
- `tests/server/` rotas com banco em memória (`*.pg.test.ts`: Postgres real) ·
  `tests/web/` telas (jsdom) ligadas às rotas de verdade por `api-bridge.ts`
