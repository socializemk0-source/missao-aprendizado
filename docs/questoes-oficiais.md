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
- Formato: `certo-errado` (gabarito com `C`/`E`) ou `multipla-escolha`
  (letras `A`–`E`; as alternativas ficam na ordem da prova e a certa é a
  letra do gabarito). `X` é item anulado nos dois.
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
   `cdn.cebraspe.org.br/concursos/<concurso>/arquivos/...`; a lista de arquivos
   de um concurso sai em `apis.cebraspe.org.br/cebraspe/eventos/<concurso>`). O
   preliminar não serve: ele muda depois dos recursos. Caderno em duas colunas:
   extrair cada coluna separada (`pdftotext -x -y -W -H`), senão as colunas se
   misturam.
2. Registrar a prova em `provas-oficiais.json`. Copiar o gabarito definitivo
   lendo o PDF por programa (`pdftotext -layout`), não à mão.
3. Transcrever os itens **sem mudar uma palavra**. Conferir por programa que o
   texto de cada item aparece igual no texto extraído da prova.
4. O contexto vai antes do item, em blocos separados por uma linha em branco:
   - o texto de apoio (título como "Texto CB1A1", um bloco por parágrafo e a
     referência no fim);
   - a situação hipotética ou a proposição;
   - o comando da banca, no singular ("julgue o item a seguir").

   A tela mostra o contexto em texto corrido e o item em destaque
   (`src/game/Enunciado.tsx`). Texto de apoio longo fica numa caixa que dá para
   recolher.
5. Ficam de fora:
   - itens anulados (`X`);
   - itens que dependem de figura, tabela ou planilha que não dá para reproduzir.
6. Escrever uma explicação nossa para cada item. Nos itens de Certo/Errado, ela
   começa com "Certo." ou "Errado.".
7. Adicionar o arquivo a um lote em `content/banco/lotes.json`, rodar
   `node scripts/banco-sql.mjs` e `npm run ci`.
8. Rodar a migração no Supabase. As questões oficiais entram já como `ativa`
   (decisão do dono, 19/10/2026): o gabarito é o definitivo da banca e está
   conferido em teste. As explicações são nossas. Se um professor apontar
   problema numa delas, corrija o JSON, rode `node scripts/banco-sql.mjs` e
   rode a `0013_v2_banco_sincroniza.sql` (ela atualiza o texto das oficiais).
   A `0020_v2_oficiais_ativas.sql` libera as que entraram antes como `revisao`.

## Provas importadas

| Prova | Itens usados | Fora |
|---|---|---|
| Cebraspe · INSS 2022 · Técnico do Seguro Social · Conhecimentos Básicos | 46 (Português, Ética, Constitucional, Administrativo, Informática, RLM) | 41–43 (figura), 49 (anulado) |
| Cebraspe · Polícia Federal 2021 · Agente de Polícia Federal | 62 (Português, redação oficial, Administrativo, Constitucional, RLM, Informática) | 28 e 92 (anulados); 31–48 (Direito Penal, legislação especial e Estatística com fórmulas); 63 e 65 (ícone); 73–78 (teoria de sistemas e gráfico); 84–85 (código); 93 em diante (outras áreas) |
| Cebraspe · TRT 8.ª Região 2022 · nível médio (conhecimentos gerais, múltipla escolha) | 14 (Português, RLM, Informática) | 7 e 10 (fórmulas que não saem do PDF), 8 e 19 (anuladas), 18–20 (normas internas do TRT) |
| Cebraspe · TRT 8.ª Região 2022 · nível superior (conhecimentos gerais, múltipla escolha) | 16 (Português, RLM, Informática) | 15 (anulada), 18–20 (normas internas do TRT) |
