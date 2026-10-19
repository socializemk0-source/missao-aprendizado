# Questões de provas oficiais

Regra 6 do `CLAUDE.md`: uma questão só é marcada como `oficial` quando foi
conferida com a prova e o **gabarito definitivo** publicados pela própria banca.
As explicações são sempre nossas. Nunca copiar enunciado, comentário ou
gabarito de sites de questões (QConcursos, TecConcursos etc.).

## Onde fica

- `content/banco/provas-oficiais.json`: o registro de cada prova usada. Guarda
  banca, órgão, cargo, ano, data da aplicação, o caderno, os links do PDF da
  prova e do gabarito definitivo **no site da banca** e o gabarito definitivo
  inteiro (`C`, `E` ou `X` para item anulado), na ordem dos itens.
- `content/banco/oficial-<prova>.json`: as questões. Cada uma tem
  `fonte: { tipo: 'oficial', banca, orgao, cargo, ano, prova, item }`.
- `tests/server/banco.test.ts` confere cada questão oficial contra o registro:
  - a prova existe;
  - banca, órgão, cargo e ano batem;
  - o item não foi anulado;
  - a resposta certa é a do gabarito definitivo;
  - o mesmo item não entra duas vezes.

## Como importar uma prova

1. Baixar a prova e o gabarito **definitivo** do site da banca (Cebraspe:
   `cdn.cebraspe.org.br/concursos/<concurso>/arquivos/...`). O preliminar não
   serve: ele muda depois dos recursos.
2. Registrar a prova em `provas-oficiais.json`. Copiar o gabarito definitivo
   lendo o PDF por programa (`pdftotext -layout`), não à mão.
3. Transcrever os itens **sem mudar uma palavra**. Conferir por programa que o
   texto de cada item aparece igual no texto extraído da prova.
4. O contexto do item (comando da banca, situação hipotética, proposição) vai
   antes do item, separado por uma linha em branco. A tela mostra o contexto em
   texto corrido e o item em destaque (`src/game/Enunciado.tsx`).
5. Ficam de fora:
   - itens anulados (`X`);
   - itens que dependem de figura, tabela ou planilha que não dá para reproduzir;
   - por enquanto, itens que dependem de um texto longo (Português). Falta a
     tela mostrar um texto de apoio.
6. Escrever uma explicação nossa para cada item. Nos itens de Certo/Errado, ela
   começa com "Certo." ou "Errado.".
7. Adicionar o arquivo a um lote em `content/banco/lotes.json`, rodar
   `node scripts/banco-sql.mjs` e `npm run ci`.
8. Rodar a migração no Supabase. As questões entram como `revisao` e chegam ao
   aluno depois que um professor aprova em `/professor`.

## Provas importadas

| Prova | Itens usados | Fora |
|---|---|---|
| Cebraspe · INSS 2022 · Técnico do Seguro Social · Conhecimentos Básicos | 32 (Ética, Constitucional, Administrativo, Informática, RLM) | 1–14 (texto de Português), 41–43 (figura), 49 (anulado) |
