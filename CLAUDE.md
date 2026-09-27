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
6. **Conteúdo com origem limpa.** Por padrão as questões são **próprias**
   (escritas por nós, no estilo da banca, `origin: "propria"`). Os termos de
   uso das bancas (ex.: FGV Conhecimento, itens 3.1 e 4) proíbem reproduzir
   as provas e usar robôs nos sites delas: questão de prova oficial
   (`origin: "oficial"`) só entra com autorização por escrito da banca
   registrada em `authorizationNote`, mais banca, ano, órgão, cargo e link.
   Nada de raspar sites de banca. Explicações são sempre nossas. Nunca copiar
   comentários, explicações ou o banco organizado de sites como TecConcursos,
   QConcursos etc. Questão nova entra como `rascunho` e só vira `publicada`
   depois da revisão de um professor da matéria.
7. **Textos em português**, claros, sem jargão técnico para o aluno.

## Comandos

- `npm run dev` — app + API local (lê `.env`, ver `.env.example`)
- `npm test` — testes (servidor e telas)
- `PG_TEST=1 SQL_SSL=false SQL_HOST=... npm test` — inclui testes com Postgres real
- `npm run ci` — tudo que o GitHub Actions roda
- `node scripts/seed-questions.mjs` — valida e carrega `content/questoes/*.json`
  em `v2.questions` (lê `SQL_*` do ambiente; nada é gravado se algo falhar)

## Estrutura

- `src/app/` rotas e menu · `src/auth/` login · `src/pages/` telas ·
  `src/layouts/` moldura do app · `src/lib/` cliente Supabase e `api()`
- `api/` uma função por rota · `server/` auth, banco, regras
- `content/questoes/` questões (uma lista JSON por matéria; formato e regras
  em `server/questions.ts`)
- `tests/server/` rotas com banco em memória · `tests/web/` telas (jsdom)
