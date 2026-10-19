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
3. Transcrever os itens **sem mudar uma palavra** (o item pode ser tirado pela
   posição das palavras na página: número na margem, texto recuado; texto
   justificado se confere com a leitura `pdftotext -raw`). Conferir por programa que o
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
6. Item cujo gabarito definitivo contradiz a lei em vigor hoje (lei mudou
   depois da prova) fica de fora: a explicação não pode ensinar o errado.
7. Escrever uma explicação nossa para cada item. Nos itens de Certo/Errado, ela
   começa com "Certo." ou "Errado.".
8. Adicionar o arquivo a um lote em `content/banco/lotes.json`, rodar
   `node scripts/banco-sql.mjs` e `npm run ci`.
9. Rodar a migração no Supabase. As questões oficiais entram já como `ativa`
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
| Cebraspe · STJ 2024 · conhecimentos básicos | 25 (Português, redação oficial, Constitucional, Administrativo, Informática) | 8, 15, 49, 50 (anulados); normas internas do STJ, Funpresp, direitos humanos, LGPD do STJ e sustentabilidade |
| Cebraspe · TRT 10.ª Região 2024 · conhecimentos básicos | 28 (Português, linguagem simples, Constitucional, Administrativo) | 1 e 10 (anulados); noções gerais de direito, direitos humanos e gestão |
| Cebraspe · TST 2023 · conhecimentos básicos (múltipla escolha) | 13 (Português, Constitucional) | 13 e 17 (anuladas); 14–16 (símbolos que não saem do PDF); pessoa com deficiência e Regimento Interno do TST |
| Cebraspe · CNJ 2024 · conhecimentos básicos | 31 (Português, RLM, Administrativo, Constitucional) | 20 e 50 (anulados); normas internas do CNJ e gestão |
| Cebraspe · PCDF 2024 · conhecimentos básicos | 27 (Português, RLM) | 28 (tabela que não sai do PDF); 31 em diante (normas e realidade do DF). O caderno vem com as justificativas do gabarito preliminar: elas não são copiadas |
| Cebraspe · TJ-CE 2023 · conhecimentos gerais (múltipla escolha) | 20 (Português, Informática, RLM) | — |
| Cebraspe · Ministério da Previdência Social 2024 · Perito Médico Federal, conhecimentos gerais | 46 (Português, redação oficial, ética, LAI, Constitucional, Lei n.º 8.112/1990, improbidade) | 44 e 47 (anulados); 49–50 (SEI) |
| Cebraspe · Ministério do Planejamento e Orçamento 2024 · Analista de Planejamento e Orçamento, conhecimentos gerais | 30 (Constitucional, Administrativo, ética, Informática e dados) | 5, 21 e outros anulados; inglês, espanhol, gestão pública, realidade brasileira, direitos humanos e o plano de integridade do MPO |
| Cebraspe · STM 2025 · Analista Judiciário, conhecimentos gerais | 27 (Português, redação oficial, Administrativo, Constitucional) | 23 e 25 (anulados); justiça militar, resoluções do CNJ e código de ética do STM |
| Cebraspe · IBAMA 2025 · Analista Ambiental, conhecimentos básicos | 30 (Português, redação oficial, Informática, ética, Constitucional, Administrativo) | 20 (anulado); inglês, análise de redes sociais, código de ética do IBAMA, assédio, gestão pública e orçamento |
| Cebraspe · TRF 6.ª Região 2024 · Analista Judiciário, conhecimentos gerais | 32 (Português, Administrativo, lógica da argumentação, direitos fundamentais) | 35 e 40 (anulados); DUDH, Agenda 2030, pessoa com deficiência e Regimento Interno do TRF6 |
| Cebraspe · Câmara dos Deputados 2025 · Analista e Técnico Legislativo, conhecimentos gerais | 57 (Português, lógica, estatística e contagem, Administrativo, LAI, LGPD) | 25 e 30 (anulados); Inglês (27 a 36) e gestão pública (69 a 90) |
| Cebraspe · TJ-PA 2025 · Analista Judiciário e Oficial de Justiça, conhecimentos gerais (cadernos dos cargos 1, 2, 6… e 5, 7, 10…) | 33 (Português, ética, Administrativo, Informática; funções e probabilidade do 2.º caderno) | Código de Ética do TJPA, gestão, Regimento Interno, leis estaduais do Pará e Resolução CNJ 351; os outros dois cadernos repetem os mesmos itens |
| Cebraspe · TCU 2025 · Técnico Federal de Controle Externo, conhecimentos básicos | 30 (Português e redação oficial, Constitucional, Informática) | 7, 19, 34 e 40 (anulados); Inglês e Regimento Interno do TCU |
| Cebraspe · Banco Central 2024 · Analista, conhecimentos básicos | 34 (Português, probabilidade, Administrativo, LGPD) | 44 (anulado); 12 (sem explicação segura); 31 a 35 (símbolos que não saem do PDF); economia (41 a 50) |
| Cebraspe · CNMP 2023 · Analista, conhecimentos básicos (cargos 1, 2, 4 a 7) | 38 (Português, Administrativo, Constitucional, Informática) | 24 e 49 (anulados); LC 75/1993, Regimento Interno do CNMP e orçamento público |
| Cebraspe · PF 2025 · cargos administrativos de nível superior, conhecimentos básicos | 48 (Português, lógica, Administrativo, Constitucional, Informática) | 37 (anulado); 31 (depende de figura) |
| Cebraspe · PF 2025 · Agente Administrativo (cargo 15), conhecimentos básicos | 50 (Português e redação oficial, lógica, Administrativo, Informática) | nenhum |
| Cebraspe · ANATEL 2024 · Especialista em Regulação, conhecimentos básicos | 30 (Português, Administrativo, Constitucional) | 19, 35 e 39 (anulados); Inglês, teoria da regulação e Lei Geral de Telecomunicações |
| Cebraspe · TJ-ES 2023 · Analista Judiciário, conhecimentos gerais | 36 (Português, ética, Administrativo, Informática, lógica e matemática) | 26 a 28 (dependem de planilha ou figura); 37 (sem explicação segura); leis estaduais e Regimento Interno do TJ-ES |
