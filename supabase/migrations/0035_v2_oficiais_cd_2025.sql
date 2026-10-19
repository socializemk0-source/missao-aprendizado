-- Questões de provas oficiais (content/banco/oficial-cd-2025-cg.json).
-- Arquivo gerado por scripts/banco-sql.mjs. Não edite à mão.
-- Entram com status 'ativa': o gabarito é o definitivo da banca, registrado em
-- content/banco/provas-oficiais.json e conferido em teste. Rodar de novo não
-- sobrescreve nada.
INSERT INTO v2.questions (id, disciplina, assunto, enunciado, alternativas, correta, explicacao, fonte, dificuldade, status) VALUES
  ('cd25-001', 'portugues', 'Pontuação', 'Texto (Linguagem Simples)

Linguagem Simples é o nome dado no Brasil a um conjunto de técnicas de redação e de design da informação usadas para produzir textos claros para o público-alvo das comunicações oficiais.

Quando falamos em “público-alvo”, estamos tratando especificamente da parcela da população a quem a informação se destina. Uma pessoa pode, por exemplo, redigir um texto para um site de câmara municipal com o objetivo de que seja compreendido por cidadãos com ensino médio completo; um folheto sobre malária para uma população ribeirinha de baixa escolaridade; ou, ainda, um estudo legislativo para embasar o trabalho de um deputado. Em qualquer dessas situações, tanto o público como a instituição vão se beneficiar do uso da Linguagem Simples.

Embora no Brasil o termo “Linguagem Simples” tenha prevalecido, o mote da técnica não é exatamente “quanto mais simples, melhor”, mas “quanto mais claro, melhor”. Tendo-se em mente que a clareza, e não a simplicidade, é a meta última da técnica, é possível e desejável usá-la até mesmo para redigir um texto técnico para o público especialista em determinado assunto. Em casos como esse, trocar palavras difíceis por outras mais fáceis não será a primeira preocupação.

A Linguagem Simples vai muito além da escolha de palavras. A técnica engloba diretrizes relacionadas à arquitetura da informação, à estrutura das frases e ao design, com o objetivo de reduzir o tempo e a dificuldade para o cérebro processar informações.

Patrícia Roedel. Manual de linguagem simples: como planejar, desenvolver e testar textos que funcionam. Brasília: Câmara dos Deputados, Edições Câmara, 2024, p. 13-14 (com adaptações).

Com base nas ideias e nos aspectos linguísticos do texto apresentado, julgue o item seguinte.

No primeiro período do segundo parágrafo, o emprego da vírgula imediatamente após ‘público-alvo’ é obrigatório e se justifica pela necessidade de serem separadas duas orações que apresentam o mesmo sujeito.', '["Certo","Errado"]'::jsonb, 1, 'Errado. A vírgula separa a oração adverbial ("Quando falamos em público-alvo"), que vem antes da principal. Não é essa a razão apontada no item: ter o mesmo sujeito não obriga a separar orações por vírgula.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":1}'::jsonb, 2, 'ativa'),
  ('cd25-002', 'portugues', 'Concordância', 'Texto (Linguagem Simples)

Linguagem Simples é o nome dado no Brasil a um conjunto de técnicas de redação e de design da informação usadas para produzir textos claros para o público-alvo das comunicações oficiais.

Quando falamos em “público-alvo”, estamos tratando especificamente da parcela da população a quem a informação se destina. Uma pessoa pode, por exemplo, redigir um texto para um site de câmara municipal com o objetivo de que seja compreendido por cidadãos com ensino médio completo; um folheto sobre malária para uma população ribeirinha de baixa escolaridade; ou, ainda, um estudo legislativo para embasar o trabalho de um deputado. Em qualquer dessas situações, tanto o público como a instituição vão se beneficiar do uso da Linguagem Simples.

Embora no Brasil o termo “Linguagem Simples” tenha prevalecido, o mote da técnica não é exatamente “quanto mais simples, melhor”, mas “quanto mais claro, melhor”. Tendo-se em mente que a clareza, e não a simplicidade, é a meta última da técnica, é possível e desejável usá-la até mesmo para redigir um texto técnico para o público especialista em determinado assunto. Em casos como esse, trocar palavras difíceis por outras mais fáceis não será a primeira preocupação.

A Linguagem Simples vai muito além da escolha de palavras. A técnica engloba diretrizes relacionadas à arquitetura da informação, à estrutura das frases e ao design, com o objetivo de reduzir o tempo e a dificuldade para o cérebro processar informações.

Patrícia Roedel. Manual de linguagem simples: como planejar, desenvolver e testar textos que funcionam. Brasília: Câmara dos Deputados, Edições Câmara, 2024, p. 13-14 (com adaptações).

Com base nas ideias e nos aspectos linguísticos do texto apresentado, julgue o item seguinte.

Seria mantida a correção gramatical do primeiro período do texto caso o termo “usadas” fosse substituído por usado.', '["Certo","Errado"]'::jsonb, 0, 'Certo. Em "um conjunto de técnicas ... usadas", o particípio pode concordar com "técnicas" (usadas) ou com o núcleo "conjunto" (usado). As duas formas são corretas.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":2}'::jsonb, 2, 'ativa'),
  ('cd25-003', 'portugues', 'Interpretação de texto', 'Texto (Linguagem Simples)

Linguagem Simples é o nome dado no Brasil a um conjunto de técnicas de redação e de design da informação usadas para produzir textos claros para o público-alvo das comunicações oficiais.

Quando falamos em “público-alvo”, estamos tratando especificamente da parcela da população a quem a informação se destina. Uma pessoa pode, por exemplo, redigir um texto para um site de câmara municipal com o objetivo de que seja compreendido por cidadãos com ensino médio completo; um folheto sobre malária para uma população ribeirinha de baixa escolaridade; ou, ainda, um estudo legislativo para embasar o trabalho de um deputado. Em qualquer dessas situações, tanto o público como a instituição vão se beneficiar do uso da Linguagem Simples.

Embora no Brasil o termo “Linguagem Simples” tenha prevalecido, o mote da técnica não é exatamente “quanto mais simples, melhor”, mas “quanto mais claro, melhor”. Tendo-se em mente que a clareza, e não a simplicidade, é a meta última da técnica, é possível e desejável usá-la até mesmo para redigir um texto técnico para o público especialista em determinado assunto. Em casos como esse, trocar palavras difíceis por outras mais fáceis não será a primeira preocupação.

A Linguagem Simples vai muito além da escolha de palavras. A técnica engloba diretrizes relacionadas à arquitetura da informação, à estrutura das frases e ao design, com o objetivo de reduzir o tempo e a dificuldade para o cérebro processar informações.

Patrícia Roedel. Manual de linguagem simples: como planejar, desenvolver e testar textos que funcionam. Brasília: Câmara dos Deputados, Edições Câmara, 2024, p. 13-14 (com adaptações).

Com base nas ideias e nos aspectos linguísticos do texto apresentado, julgue o item seguinte.

O texto informa que Linguagem Simples é um padrão de linguagem com estruturas linguísticas e palavras próprias que se volta à simplificação dos textos para a completa assimilação do seu conteúdo pelo público a que tais textos se destinam.', '["Certo","Errado"]'::jsonb, 1, 'Errado. O texto define Linguagem Simples como um conjunto de técnicas de redação e de design da informação, e não como um padrão de linguagem com palavras próprias. E diz que a meta é a clareza, não a simplificação.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":3}'::jsonb, 2, 'ativa'),
  ('cd25-004', 'portugues', 'Sentido das palavras', 'Texto (Linguagem Simples)

Linguagem Simples é o nome dado no Brasil a um conjunto de técnicas de redação e de design da informação usadas para produzir textos claros para o público-alvo das comunicações oficiais.

Quando falamos em “público-alvo”, estamos tratando especificamente da parcela da população a quem a informação se destina. Uma pessoa pode, por exemplo, redigir um texto para um site de câmara municipal com o objetivo de que seja compreendido por cidadãos com ensino médio completo; um folheto sobre malária para uma população ribeirinha de baixa escolaridade; ou, ainda, um estudo legislativo para embasar o trabalho de um deputado. Em qualquer dessas situações, tanto o público como a instituição vão se beneficiar do uso da Linguagem Simples.

Embora no Brasil o termo “Linguagem Simples” tenha prevalecido, o mote da técnica não é exatamente “quanto mais simples, melhor”, mas “quanto mais claro, melhor”. Tendo-se em mente que a clareza, e não a simplicidade, é a meta última da técnica, é possível e desejável usá-la até mesmo para redigir um texto técnico para o público especialista em determinado assunto. Em casos como esse, trocar palavras difíceis por outras mais fáceis não será a primeira preocupação.

A Linguagem Simples vai muito além da escolha de palavras. A técnica engloba diretrizes relacionadas à arquitetura da informação, à estrutura das frases e ao design, com o objetivo de reduzir o tempo e a dificuldade para o cérebro processar informações.

Patrícia Roedel. Manual de linguagem simples: como planejar, desenvolver e testar textos que funcionam. Brasília: Câmara dos Deputados, Edições Câmara, 2024, p. 13-14 (com adaptações).

Com base nas ideias e nos aspectos linguísticos do texto apresentado, julgue o item seguinte.

A substituição de “a meta última” (segundo período do terceiro parágrafo) por a última meta alteraria o sentido veiculado originalmente no texto e poderia comprometer a coerência textual.', '["Certo","Errado"]'::jsonb, 0, 'Certo. "A meta última" é a meta final, o objetivo maior. "A última meta" seria a que vem por último numa sequência. A troca muda o sentido e prejudica a coerência.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":4}'::jsonb, 2, 'ativa'),
  ('cd25-005', 'portugues', 'Interpretação de texto', 'Texto (Linguagem Simples)

Linguagem Simples é o nome dado no Brasil a um conjunto de técnicas de redação e de design da informação usadas para produzir textos claros para o público-alvo das comunicações oficiais.

Quando falamos em “público-alvo”, estamos tratando especificamente da parcela da população a quem a informação se destina. Uma pessoa pode, por exemplo, redigir um texto para um site de câmara municipal com o objetivo de que seja compreendido por cidadãos com ensino médio completo; um folheto sobre malária para uma população ribeirinha de baixa escolaridade; ou, ainda, um estudo legislativo para embasar o trabalho de um deputado. Em qualquer dessas situações, tanto o público como a instituição vão se beneficiar do uso da Linguagem Simples.

Embora no Brasil o termo “Linguagem Simples” tenha prevalecido, o mote da técnica não é exatamente “quanto mais simples, melhor”, mas “quanto mais claro, melhor”. Tendo-se em mente que a clareza, e não a simplicidade, é a meta última da técnica, é possível e desejável usá-la até mesmo para redigir um texto técnico para o público especialista em determinado assunto. Em casos como esse, trocar palavras difíceis por outras mais fáceis não será a primeira preocupação.

A Linguagem Simples vai muito além da escolha de palavras. A técnica engloba diretrizes relacionadas à arquitetura da informação, à estrutura das frases e ao design, com o objetivo de reduzir o tempo e a dificuldade para o cérebro processar informações.

Patrícia Roedel. Manual de linguagem simples: como planejar, desenvolver e testar textos que funcionam. Brasília: Câmara dos Deputados, Edições Câmara, 2024, p. 13-14 (com adaptações).

Com base nas ideias e nos aspectos linguísticos do texto apresentado, julgue o item seguinte.

Segundo o texto, apesar de a Linguagem Simples ir além da mera seleção vocabular, o cuidado com essa seleção varia conforme a complexidade do gênero textual e do público-alvo, indo de importante, passando a secundário, até ser considerado irrelevante.', '["Certo","Errado"]'::jsonb, 1, 'Errado. O texto diz que, num texto técnico para especialistas, trocar palavras difíceis "não será a primeira preocupação". Isso não quer dizer que a escolha de palavras se torne irrelevante, nem o texto apresenta essa escala.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":5}'::jsonb, 2, 'ativa'),
  ('cd25-006', 'portugues', 'Interpretação de texto', 'Texto (Linguagem Simples)

Linguagem Simples é o nome dado no Brasil a um conjunto de técnicas de redação e de design da informação usadas para produzir textos claros para o público-alvo das comunicações oficiais.

Quando falamos em “público-alvo”, estamos tratando especificamente da parcela da população a quem a informação se destina. Uma pessoa pode, por exemplo, redigir um texto para um site de câmara municipal com o objetivo de que seja compreendido por cidadãos com ensino médio completo; um folheto sobre malária para uma população ribeirinha de baixa escolaridade; ou, ainda, um estudo legislativo para embasar o trabalho de um deputado. Em qualquer dessas situações, tanto o público como a instituição vão se beneficiar do uso da Linguagem Simples.

Embora no Brasil o termo “Linguagem Simples” tenha prevalecido, o mote da técnica não é exatamente “quanto mais simples, melhor”, mas “quanto mais claro, melhor”. Tendo-se em mente que a clareza, e não a simplicidade, é a meta última da técnica, é possível e desejável usá-la até mesmo para redigir um texto técnico para o público especialista em determinado assunto. Em casos como esse, trocar palavras difíceis por outras mais fáceis não será a primeira preocupação.

A Linguagem Simples vai muito além da escolha de palavras. A técnica engloba diretrizes relacionadas à arquitetura da informação, à estrutura das frases e ao design, com o objetivo de reduzir o tempo e a dificuldade para o cérebro processar informações.

Patrícia Roedel. Manual de linguagem simples: como planejar, desenvolver e testar textos que funcionam. Brasília: Câmara dos Deputados, Edições Câmara, 2024, p. 13-14 (com adaptações).

Com base nas ideias e nos aspectos linguísticos do texto apresentado, julgue o item seguinte.

Conforme o texto, a clareza é uma das ferramentas usadas na Linguagem Simples com o fim de simplificar os temas tratados nos textos, permitindo-se, assim, que eles sejam plenamente entendidos pela população como um todo.', '["Certo","Errado"]'::jsonb, 1, 'Errado. Para o texto, a clareza é a meta da técnica, não uma ferramenta. E o objetivo é que o texto seja claro para o seu público-alvo, não para a população como um todo.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":6}'::jsonb, 2, 'ativa'),
  ('cd25-007', 'portugues', 'Sintaxe: funções', 'Texto (Linguagem Simples)

Linguagem Simples é o nome dado no Brasil a um conjunto de técnicas de redação e de design da informação usadas para produzir textos claros para o público-alvo das comunicações oficiais.

Quando falamos em “público-alvo”, estamos tratando especificamente da parcela da população a quem a informação se destina. Uma pessoa pode, por exemplo, redigir um texto para um site de câmara municipal com o objetivo de que seja compreendido por cidadãos com ensino médio completo; um folheto sobre malária para uma população ribeirinha de baixa escolaridade; ou, ainda, um estudo legislativo para embasar o trabalho de um deputado. Em qualquer dessas situações, tanto o público como a instituição vão se beneficiar do uso da Linguagem Simples.

Embora no Brasil o termo “Linguagem Simples” tenha prevalecido, o mote da técnica não é exatamente “quanto mais simples, melhor”, mas “quanto mais claro, melhor”. Tendo-se em mente que a clareza, e não a simplicidade, é a meta última da técnica, é possível e desejável usá-la até mesmo para redigir um texto técnico para o público especialista em determinado assunto. Em casos como esse, trocar palavras difíceis por outras mais fáceis não será a primeira preocupação.

A Linguagem Simples vai muito além da escolha de palavras. A técnica engloba diretrizes relacionadas à arquitetura da informação, à estrutura das frases e ao design, com o objetivo de reduzir o tempo e a dificuldade para o cérebro processar informações.

Patrícia Roedel. Manual de linguagem simples: como planejar, desenvolver e testar textos que funcionam. Brasília: Câmara dos Deputados, Edições Câmara, 2024, p. 13-14 (com adaptações).

Com base nas ideias e nos aspectos linguísticos do texto apresentado, julgue o item seguinte.

No segundo parágrafo, os termos preposicionados “por cidadãos com ensino médio completo” (segundo período) e “do uso da Linguagem Simples” (último período) desempenham a mesma função sintática nas orações em que ocorrem — ambas na voz passiva.', '["Certo","Errado"]'::jsonb, 1, 'Errado. "Por cidadãos com ensino médio completo" é agente da passiva de "compreendido". Já "do uso da Linguagem Simples" completa o verbo "beneficiar-se (de)", que não está na voz passiva: é objeto indireto.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":7}'::jsonb, 3, 'ativa'),
  ('cd25-008', 'portugues', 'Colocação pronominal', 'Texto (Linguagem Simples)

Linguagem Simples é o nome dado no Brasil a um conjunto de técnicas de redação e de design da informação usadas para produzir textos claros para o público-alvo das comunicações oficiais.

Quando falamos em “público-alvo”, estamos tratando especificamente da parcela da população a quem a informação se destina. Uma pessoa pode, por exemplo, redigir um texto para um site de câmara municipal com o objetivo de que seja compreendido por cidadãos com ensino médio completo; um folheto sobre malária para uma população ribeirinha de baixa escolaridade; ou, ainda, um estudo legislativo para embasar o trabalho de um deputado. Em qualquer dessas situações, tanto o público como a instituição vão se beneficiar do uso da Linguagem Simples.

Embora no Brasil o termo “Linguagem Simples” tenha prevalecido, o mote da técnica não é exatamente “quanto mais simples, melhor”, mas “quanto mais claro, melhor”. Tendo-se em mente que a clareza, e não a simplicidade, é a meta última da técnica, é possível e desejável usá-la até mesmo para redigir um texto técnico para o público especialista em determinado assunto. Em casos como esse, trocar palavras difíceis por outras mais fáceis não será a primeira preocupação.

A Linguagem Simples vai muito além da escolha de palavras. A técnica engloba diretrizes relacionadas à arquitetura da informação, à estrutura das frases e ao design, com o objetivo de reduzir o tempo e a dificuldade para o cérebro processar informações.

Patrícia Roedel. Manual de linguagem simples: como planejar, desenvolver e testar textos que funcionam. Brasília: Câmara dos Deputados, Edições Câmara, 2024, p. 13-14 (com adaptações).

Com base nas ideias e nos aspectos linguísticos do texto apresentado, julgue o item seguinte.

A forma pronominal “se”, em “vão se beneficiar” (último período do segundo parágrafo), poderia ser corretamente deslocada para imediatamente após a forma verbal infinitiva, da seguinte forma: vão beneficiar-se.', '["Certo","Errado"]'::jsonb, 0, 'Certo. Na locução "vão se beneficiar", o pronome pode ficar depois do infinitivo, ligado por hífen: "vão beneficiar-se". A frase continua correta.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":8}'::jsonb, 1, 'ativa'),
  ('cd25-009', 'portugues', 'Tempos verbais', 'Texto (Linguagem Simples)

Linguagem Simples é o nome dado no Brasil a um conjunto de técnicas de redação e de design da informação usadas para produzir textos claros para o público-alvo das comunicações oficiais.

Quando falamos em “público-alvo”, estamos tratando especificamente da parcela da população a quem a informação se destina. Uma pessoa pode, por exemplo, redigir um texto para um site de câmara municipal com o objetivo de que seja compreendido por cidadãos com ensino médio completo; um folheto sobre malária para uma população ribeirinha de baixa escolaridade; ou, ainda, um estudo legislativo para embasar o trabalho de um deputado. Em qualquer dessas situações, tanto o público como a instituição vão se beneficiar do uso da Linguagem Simples.

Embora no Brasil o termo “Linguagem Simples” tenha prevalecido, o mote da técnica não é exatamente “quanto mais simples, melhor”, mas “quanto mais claro, melhor”. Tendo-se em mente que a clareza, e não a simplicidade, é a meta última da técnica, é possível e desejável usá-la até mesmo para redigir um texto técnico para o público especialista em determinado assunto. Em casos como esse, trocar palavras difíceis por outras mais fáceis não será a primeira preocupação.

A Linguagem Simples vai muito além da escolha de palavras. A técnica engloba diretrizes relacionadas à arquitetura da informação, à estrutura das frases e ao design, com o objetivo de reduzir o tempo e a dificuldade para o cérebro processar informações.

Patrícia Roedel. Manual de linguagem simples: como planejar, desenvolver e testar textos que funcionam. Brasília: Câmara dos Deputados, Edições Câmara, 2024, p. 13-14 (com adaptações).

Com base nas ideias e nos aspectos linguísticos do texto apresentado, julgue o item seguinte.

Visto que, no primeiro período do terceiro parágrafo, a locução verbal “tenha prevalecido” corresponde ao tempo pretérito, conclui-se que o verbo da oração principal do período está empregado no presente histórico, em obediência ao paralelismo temporal.', '["Certo","Errado"]'::jsonb, 1, 'Errado. O verbo principal ("não é") está no presente com valor atual, de algo que vale hoje, e não no presente histórico (usado para narrar fatos passados). Não há exigência de "paralelismo temporal" com "tenha prevalecido".', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":9}'::jsonb, 3, 'ativa'),
  ('cd25-010', 'portugues', 'Sintaxe: aposto', 'Texto (pantanal)

A maior planície alagável do mundo está secando e ficando mais quente a um ritmo acelerado. Em quatro décadas, o pantanal, o menor bioma brasileiro, foi o que mais aqueceu e teve a maior redução na quantidade de chuvas. Essa dupla tendência, de mais calor e de menos pluviosidade, é visível em todos os ecossistemas nacionais — da amazônia, no Norte, que engloba quase metade da área do país, ao pampa, no Rio Grande do Sul, ainda que nesse bioma de forma bem menos perceptível.

Entre 1985 e 2024, a temperatura média no bioma subiu 0,47 °C por década. Em quatro décadas, o aumento acumulado no pantanal chega a quase 1,9 °C. O ritmo de crescimento do aquecimento no pantanal é 60% superior ao calculado no mesmo período para o Brasil como um todo e para os biomas amazônia e cerrado, que abrangem quase três quartos da área nacional. A velocidade de subida dos termômetros no pantanal é ainda cerca do dobro da apresentada na caatinga e na mata atlântica e mais que o triplo da do pampa nos 40 anos analisados.

Marcos Pivetta. Um pantanal mais quente e seco. In: Revista Pesquisa FAPESP, 2026, v. 360, p. 45 (com adaptações).

Julgue o próximo item, referente ao texto precedente.

O termo “brasileiro” (segundo período do primeiro parágrafo) desempenha a mesma função sintática dos termos “amazônia” e “cerrado” (terceiro período do segundo parágrafo): o primeiro modifica o nome “bioma”, e os dois últimos, “biomas”.', '["Certo","Errado"]'::jsonb, 1, 'Errado. "Brasileiro" é adjetivo que caracteriza "bioma" (adjunto adnominal). Já "amazônia" e "cerrado" nomeiam quais são os biomas: funcionam como aposto de "biomas". As funções são diferentes.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":10}'::jsonb, 3, 'ativa'),
  ('cd25-011', 'portugues', 'Crase', 'Texto (pantanal)

A maior planície alagável do mundo está secando e ficando mais quente a um ritmo acelerado. Em quatro décadas, o pantanal, o menor bioma brasileiro, foi o que mais aqueceu e teve a maior redução na quantidade de chuvas. Essa dupla tendência, de mais calor e de menos pluviosidade, é visível em todos os ecossistemas nacionais — da amazônia, no Norte, que engloba quase metade da área do país, ao pampa, no Rio Grande do Sul, ainda que nesse bioma de forma bem menos perceptível.

Entre 1985 e 2024, a temperatura média no bioma subiu 0,47 °C por década. Em quatro décadas, o aumento acumulado no pantanal chega a quase 1,9 °C. O ritmo de crescimento do aquecimento no pantanal é 60% superior ao calculado no mesmo período para o Brasil como um todo e para os biomas amazônia e cerrado, que abrangem quase três quartos da área nacional. A velocidade de subida dos termômetros no pantanal é ainda cerca do dobro da apresentada na caatinga e na mata atlântica e mais que o triplo da do pampa nos 40 anos analisados.

Marcos Pivetta. Um pantanal mais quente e seco. In: Revista Pesquisa FAPESP, 2026, v. 360, p. 45 (com adaptações).

Julgue o próximo item, referente ao texto precedente.

O trecho “superior ao calculado no mesmo período” (terceiro período do segundo parágrafo) poderia ser corretamente reescrito como superior aquele calculado em idêntico período.', '["Certo","Errado"]'::jsonb, 1, 'Errado. "Superior" pede a preposição "a", que se junta ao "a" de "aquele": o correto seria "superior àquele", com acento grave.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":11}'::jsonb, 1, 'ativa'),
  ('cd25-012', 'portugues', 'Tipologia textual', 'Texto (pantanal)

A maior planície alagável do mundo está secando e ficando mais quente a um ritmo acelerado. Em quatro décadas, o pantanal, o menor bioma brasileiro, foi o que mais aqueceu e teve a maior redução na quantidade de chuvas. Essa dupla tendência, de mais calor e de menos pluviosidade, é visível em todos os ecossistemas nacionais — da amazônia, no Norte, que engloba quase metade da área do país, ao pampa, no Rio Grande do Sul, ainda que nesse bioma de forma bem menos perceptível.

Entre 1985 e 2024, a temperatura média no bioma subiu 0,47 °C por década. Em quatro décadas, o aumento acumulado no pantanal chega a quase 1,9 °C. O ritmo de crescimento do aquecimento no pantanal é 60% superior ao calculado no mesmo período para o Brasil como um todo e para os biomas amazônia e cerrado, que abrangem quase três quartos da área nacional. A velocidade de subida dos termômetros no pantanal é ainda cerca do dobro da apresentada na caatinga e na mata atlântica e mais que o triplo da do pampa nos 40 anos analisados.

Marcos Pivetta. Um pantanal mais quente e seco. In: Revista Pesquisa FAPESP, 2026, v. 360, p. 45 (com adaptações).

Julgue o próximo item, referente ao texto precedente.

Predomina, no segundo parágrafo do texto, a tipologia descritiva.', '["Certo","Errado"]'::jsonb, 1, 'Errado. O parágrafo apresenta dados e comparações (graus por década, percentuais) para informar o leitor: predomina a exposição, não a descrição.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":12}'::jsonb, 2, 'ativa'),
  ('cd25-013', 'portugues', 'Interpretação de texto', 'Texto (pantanal)

A maior planície alagável do mundo está secando e ficando mais quente a um ritmo acelerado. Em quatro décadas, o pantanal, o menor bioma brasileiro, foi o que mais aqueceu e teve a maior redução na quantidade de chuvas. Essa dupla tendência, de mais calor e de menos pluviosidade, é visível em todos os ecossistemas nacionais — da amazônia, no Norte, que engloba quase metade da área do país, ao pampa, no Rio Grande do Sul, ainda que nesse bioma de forma bem menos perceptível.

Entre 1985 e 2024, a temperatura média no bioma subiu 0,47 °C por década. Em quatro décadas, o aumento acumulado no pantanal chega a quase 1,9 °C. O ritmo de crescimento do aquecimento no pantanal é 60% superior ao calculado no mesmo período para o Brasil como um todo e para os biomas amazônia e cerrado, que abrangem quase três quartos da área nacional. A velocidade de subida dos termômetros no pantanal é ainda cerca do dobro da apresentada na caatinga e na mata atlântica e mais que o triplo da do pampa nos 40 anos analisados.

Marcos Pivetta. Um pantanal mais quente e seco. In: Revista Pesquisa FAPESP, 2026, v. 360, p. 45 (com adaptações).

Julgue o próximo item, referente ao texto precedente.

De acordo com o texto, menor pluviosidade e aumento do calor no pantanal se caracterizam como um processo gradativo.', '["Certo","Errado"]'::jsonb, 0, 'Certo. O texto mostra calor e seca aumentando ao longo de quatro décadas, década a década ("0,47 °C por década"): é um processo que acontece aos poucos.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":13}'::jsonb, 1, 'ativa'),
  ('cd25-014', 'portugues', 'Sintaxe: orações', 'Texto (mulheres na política)

Novos dados da União Interparlamentar (UIP) e da ONU Mulheres revelam um progresso limitado no alcance da igualdade de gênero na liderança política. A edição de 2025 do mapa Mulheres na política mostra que os homens continuam a superar as mulheres em mais de três vezes nas posições executivas e legislativas em todo o mundo.

Globalmente, a presença feminina nos parlamentos subiu apenas 0,3%, alcançando 27,2% em relação ao ano anterior. Já nos ministérios, houve queda de 0,4%. Segundo Sima Bahous, diretora executiva da ONU Mulheres, o progresso não só é lento como há retrocesso em várias partes do mundo. “Trinta anos após a Declaração de Pequim, a promessa de igualdade de gênero na liderança política permanece não cumprida. Não podemos aceitar um mundo onde metade da população seja sistematicamente excluída da tomada de decisões”, frisou.

Bahous também lembrou que cotas, reformas eleitorais e vontade política são soluções para desmantelar barreiras sistêmicas. “O tempo das medidas paliativas acabou. É hora de os governos agirem para assegurar que as mulheres tenham um assento igual em todas as mesas onde o poder é exercido”, destacou.

A presidente da UIP, Tulia Ackson, classificou o ritmo de avanço como “glacial” e ressaltou a urgência de medidas concretas para garantir representação igualitária. O secretário-geral da UIP, Martin Chungong, defendeu o engajamento ativo de homens como parte da solução.

Ainda, o mapa de 2025 mostra que, enquanto as mulheres lideram importantes pastas ligadas a direitos humanos, igualdade de gênero e proteção social, os homens dominam áreas como relações exteriores, orçamento e defesa.

Internet: <onumulheres.org.br> (com adaptações).

Em relação às ideias e aos aspectos linguísticos do texto apresentado, julgue o item seguinte.

As orações ‘para assegurar’ (terceiro período do terceiro parágrafo) e “para garantir representação igualitária” (primeiro período do quarto parágrafo) exercem função adverbial e expressam circunstância de finalidade.', '["Certo","Errado"]'::jsonb, 1, 'Errado. "Para assegurar" indica a finalidade de "agirem" (função adverbial). Já "para garantir representação igualitária" especifica que medidas são essas: refere-se ao nome "medidas", e não a um verbo.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":14}'::jsonb, 3, 'ativa'),
  ('cd25-015', 'portugues', 'Reescrita de frases', 'Texto (mulheres na política)

Novos dados da União Interparlamentar (UIP) e da ONU Mulheres revelam um progresso limitado no alcance da igualdade de gênero na liderança política. A edição de 2025 do mapa Mulheres na política mostra que os homens continuam a superar as mulheres em mais de três vezes nas posições executivas e legislativas em todo o mundo.

Globalmente, a presença feminina nos parlamentos subiu apenas 0,3%, alcançando 27,2% em relação ao ano anterior. Já nos ministérios, houve queda de 0,4%. Segundo Sima Bahous, diretora executiva da ONU Mulheres, o progresso não só é lento como há retrocesso em várias partes do mundo. “Trinta anos após a Declaração de Pequim, a promessa de igualdade de gênero na liderança política permanece não cumprida. Não podemos aceitar um mundo onde metade da população seja sistematicamente excluída da tomada de decisões”, frisou.

Bahous também lembrou que cotas, reformas eleitorais e vontade política são soluções para desmantelar barreiras sistêmicas. “O tempo das medidas paliativas acabou. É hora de os governos agirem para assegurar que as mulheres tenham um assento igual em todas as mesas onde o poder é exercido”, destacou.

A presidente da UIP, Tulia Ackson, classificou o ritmo de avanço como “glacial” e ressaltou a urgência de medidas concretas para garantir representação igualitária. O secretário-geral da UIP, Martin Chungong, defendeu o engajamento ativo de homens como parte da solução.

Ainda, o mapa de 2025 mostra que, enquanto as mulheres lideram importantes pastas ligadas a direitos humanos, igualdade de gênero e proteção social, os homens dominam áreas como relações exteriores, orçamento e defesa.

Internet: <onumulheres.org.br> (com adaptações).

Em relação às ideias e aos aspectos linguísticos do texto apresentado, julgue o item seguinte.

Estariam mantidos os sentidos e a correção gramatical do texto caso o trecho “Ainda, o mapa de 2025 mostra que” (último parágrafo) fosse assim reescrito: O mapa de 2025 mostra, ainda, que.', '["Certo","Errado"]'::jsonb, 0, 'Certo. Na reescrita, "ainda", entre vírgulas, continua acrescentando uma informação, e a frase segue correta: "O mapa de 2025 mostra, ainda, que...".', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":15}'::jsonb, 1, 'ativa'),
  ('cd25-016', 'portugues', 'Crase', 'Texto (mulheres na política)

Novos dados da União Interparlamentar (UIP) e da ONU Mulheres revelam um progresso limitado no alcance da igualdade de gênero na liderança política. A edição de 2025 do mapa Mulheres na política mostra que os homens continuam a superar as mulheres em mais de três vezes nas posições executivas e legislativas em todo o mundo.

Globalmente, a presença feminina nos parlamentos subiu apenas 0,3%, alcançando 27,2% em relação ao ano anterior. Já nos ministérios, houve queda de 0,4%. Segundo Sima Bahous, diretora executiva da ONU Mulheres, o progresso não só é lento como há retrocesso em várias partes do mundo. “Trinta anos após a Declaração de Pequim, a promessa de igualdade de gênero na liderança política permanece não cumprida. Não podemos aceitar um mundo onde metade da população seja sistematicamente excluída da tomada de decisões”, frisou.

Bahous também lembrou que cotas, reformas eleitorais e vontade política são soluções para desmantelar barreiras sistêmicas. “O tempo das medidas paliativas acabou. É hora de os governos agirem para assegurar que as mulheres tenham um assento igual em todas as mesas onde o poder é exercido”, destacou.

A presidente da UIP, Tulia Ackson, classificou o ritmo de avanço como “glacial” e ressaltou a urgência de medidas concretas para garantir representação igualitária. O secretário-geral da UIP, Martin Chungong, defendeu o engajamento ativo de homens como parte da solução.

Ainda, o mapa de 2025 mostra que, enquanto as mulheres lideram importantes pastas ligadas a direitos humanos, igualdade de gênero e proteção social, os homens dominam áreas como relações exteriores, orçamento e defesa.

Internet: <onumulheres.org.br> (com adaptações).

Em relação às ideias e aos aspectos linguísticos do texto apresentado, julgue o item seguinte.

É facultativo o emprego do acento indicativo de crase no vocábulo “as” em “superar as mulheres” (segundo período do primeiro parágrafo).', '["Certo","Errado"]'::jsonb, 1, 'Errado. "Superar" é transitivo direto: supera-se alguém, sem preposição. Sem a preposição "a", não há crase. O acento seria erro, não opção.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":16}'::jsonb, 1, 'ativa'),
  ('cd25-017', 'portugues', 'Interpretação de texto', 'Texto (mulheres na política)

Novos dados da União Interparlamentar (UIP) e da ONU Mulheres revelam um progresso limitado no alcance da igualdade de gênero na liderança política. A edição de 2025 do mapa Mulheres na política mostra que os homens continuam a superar as mulheres em mais de três vezes nas posições executivas e legislativas em todo o mundo.

Globalmente, a presença feminina nos parlamentos subiu apenas 0,3%, alcançando 27,2% em relação ao ano anterior. Já nos ministérios, houve queda de 0,4%. Segundo Sima Bahous, diretora executiva da ONU Mulheres, o progresso não só é lento como há retrocesso em várias partes do mundo. “Trinta anos após a Declaração de Pequim, a promessa de igualdade de gênero na liderança política permanece não cumprida. Não podemos aceitar um mundo onde metade da população seja sistematicamente excluída da tomada de decisões”, frisou.

Bahous também lembrou que cotas, reformas eleitorais e vontade política são soluções para desmantelar barreiras sistêmicas. “O tempo das medidas paliativas acabou. É hora de os governos agirem para assegurar que as mulheres tenham um assento igual em todas as mesas onde o poder é exercido”, destacou.

A presidente da UIP, Tulia Ackson, classificou o ritmo de avanço como “glacial” e ressaltou a urgência de medidas concretas para garantir representação igualitária. O secretário-geral da UIP, Martin Chungong, defendeu o engajamento ativo de homens como parte da solução.

Ainda, o mapa de 2025 mostra que, enquanto as mulheres lideram importantes pastas ligadas a direitos humanos, igualdade de gênero e proteção social, os homens dominam áreas como relações exteriores, orçamento e defesa.

Internet: <onumulheres.org.br> (com adaptações).

Em relação às ideias e aos aspectos linguísticos do texto apresentado, julgue o item seguinte.

Infere-se do texto que a UIP defende a proteção masculina às mulheres como medida concreta para a garantia de representação igualitária nos espaços de poder, o que sugere o enraizamento do posicionamento machista na sociedade.', '["Certo","Errado"]'::jsonb, 1, 'Errado. O texto diz que o secretário-geral da UIP defendeu o engajamento ativo dos homens como parte da solução, e não a proteção masculina às mulheres. Nada no texto sustenta a conclusão sobre machismo.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":17}'::jsonb, 2, 'ativa'),
  ('cd25-018', 'portugues', 'Interpretação de texto', 'Texto (mulheres na política)

Novos dados da União Interparlamentar (UIP) e da ONU Mulheres revelam um progresso limitado no alcance da igualdade de gênero na liderança política. A edição de 2025 do mapa Mulheres na política mostra que os homens continuam a superar as mulheres em mais de três vezes nas posições executivas e legislativas em todo o mundo.

Globalmente, a presença feminina nos parlamentos subiu apenas 0,3%, alcançando 27,2% em relação ao ano anterior. Já nos ministérios, houve queda de 0,4%. Segundo Sima Bahous, diretora executiva da ONU Mulheres, o progresso não só é lento como há retrocesso em várias partes do mundo. “Trinta anos após a Declaração de Pequim, a promessa de igualdade de gênero na liderança política permanece não cumprida. Não podemos aceitar um mundo onde metade da população seja sistematicamente excluída da tomada de decisões”, frisou.

Bahous também lembrou que cotas, reformas eleitorais e vontade política são soluções para desmantelar barreiras sistêmicas. “O tempo das medidas paliativas acabou. É hora de os governos agirem para assegurar que as mulheres tenham um assento igual em todas as mesas onde o poder é exercido”, destacou.

A presidente da UIP, Tulia Ackson, classificou o ritmo de avanço como “glacial” e ressaltou a urgência de medidas concretas para garantir representação igualitária. O secretário-geral da UIP, Martin Chungong, defendeu o engajamento ativo de homens como parte da solução.

Ainda, o mapa de 2025 mostra que, enquanto as mulheres lideram importantes pastas ligadas a direitos humanos, igualdade de gênero e proteção social, os homens dominam áreas como relações exteriores, orçamento e defesa.

Internet: <onumulheres.org.br> (com adaptações).

Em relação às ideias e aos aspectos linguísticos do texto apresentado, julgue o item seguinte.

O ritmo de avanço das medidas para o alcance da igualdade de gênero na liderança política no mundo é considerado desalentador pela autoridade máxima da UIP.', '["Certo","Errado"]'::jsonb, 0, 'Certo. A presidente da UIP classificou o ritmo de avanço como "glacial", isto é, lentíssimo: uma avaliação desanimadora.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":18}'::jsonb, 1, 'ativa'),
  ('cd25-019', 'portugues', 'Sentido das palavras', 'Texto (mulheres na política)

Novos dados da União Interparlamentar (UIP) e da ONU Mulheres revelam um progresso limitado no alcance da igualdade de gênero na liderança política. A edição de 2025 do mapa Mulheres na política mostra que os homens continuam a superar as mulheres em mais de três vezes nas posições executivas e legislativas em todo o mundo.

Globalmente, a presença feminina nos parlamentos subiu apenas 0,3%, alcançando 27,2% em relação ao ano anterior. Já nos ministérios, houve queda de 0,4%. Segundo Sima Bahous, diretora executiva da ONU Mulheres, o progresso não só é lento como há retrocesso em várias partes do mundo. “Trinta anos após a Declaração de Pequim, a promessa de igualdade de gênero na liderança política permanece não cumprida. Não podemos aceitar um mundo onde metade da população seja sistematicamente excluída da tomada de decisões”, frisou.

Bahous também lembrou que cotas, reformas eleitorais e vontade política são soluções para desmantelar barreiras sistêmicas. “O tempo das medidas paliativas acabou. É hora de os governos agirem para assegurar que as mulheres tenham um assento igual em todas as mesas onde o poder é exercido”, destacou.

A presidente da UIP, Tulia Ackson, classificou o ritmo de avanço como “glacial” e ressaltou a urgência de medidas concretas para garantir representação igualitária. O secretário-geral da UIP, Martin Chungong, defendeu o engajamento ativo de homens como parte da solução.

Ainda, o mapa de 2025 mostra que, enquanto as mulheres lideram importantes pastas ligadas a direitos humanos, igualdade de gênero e proteção social, os homens dominam áreas como relações exteriores, orçamento e defesa.

Internet: <onumulheres.org.br> (com adaptações).

Em relação às ideias e aos aspectos linguísticos do texto apresentado, julgue o item seguinte.

O vocábulo ‘paliativas’ (segundo período do terceiro parágrafo) poderia ser substituído, sem comprometimento da coerência das ideias do texto, por protelatórias.', '["Certo","Errado"]'::jsonb, 0, 'Certo. "Paliativas" são medidas que aliviam sem resolver; "protelatórias", as que adiam a solução. As duas palavras indicam respostas insuficientes, e a frase continua coerente com o que vem depois: chegou a hora de os governos agirem de verdade.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":19}'::jsonb, 2, 'ativa'),
  ('cd25-020', 'portugues', 'Sentido das palavras', 'Texto (mulheres na política)

Novos dados da União Interparlamentar (UIP) e da ONU Mulheres revelam um progresso limitado no alcance da igualdade de gênero na liderança política. A edição de 2025 do mapa Mulheres na política mostra que os homens continuam a superar as mulheres em mais de três vezes nas posições executivas e legislativas em todo o mundo.

Globalmente, a presença feminina nos parlamentos subiu apenas 0,3%, alcançando 27,2% em relação ao ano anterior. Já nos ministérios, houve queda de 0,4%. Segundo Sima Bahous, diretora executiva da ONU Mulheres, o progresso não só é lento como há retrocesso em várias partes do mundo. “Trinta anos após a Declaração de Pequim, a promessa de igualdade de gênero na liderança política permanece não cumprida. Não podemos aceitar um mundo onde metade da população seja sistematicamente excluída da tomada de decisões”, frisou.

Bahous também lembrou que cotas, reformas eleitorais e vontade política são soluções para desmantelar barreiras sistêmicas. “O tempo das medidas paliativas acabou. É hora de os governos agirem para assegurar que as mulheres tenham um assento igual em todas as mesas onde o poder é exercido”, destacou.

A presidente da UIP, Tulia Ackson, classificou o ritmo de avanço como “glacial” e ressaltou a urgência de medidas concretas para garantir representação igualitária. O secretário-geral da UIP, Martin Chungong, defendeu o engajamento ativo de homens como parte da solução.

Ainda, o mapa de 2025 mostra que, enquanto as mulheres lideram importantes pastas ligadas a direitos humanos, igualdade de gênero e proteção social, os homens dominam áreas como relações exteriores, orçamento e defesa.

Internet: <onumulheres.org.br> (com adaptações).

Em relação às ideias e aos aspectos linguísticos do texto apresentado, julgue o item seguinte.

No primeiro período do quarto parágrafo, o emprego do termo presidenta em vez de “presidente” não só preservaria a correção do texto como também evidenciaria uma opção política de gênero, em consonância com os ideais de maior representatividade das mulheres nas esferas de poder.', '["Certo","Errado"]'::jsonb, 0, 'Certo. "Presidenta" está registrada nos dicionários e é correta. Escolhê-la no lugar de "presidente" marca o gênero feminino, o que combina com o tema do texto.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":20}'::jsonb, 2, 'ativa'),
  ('cd25-021', 'portugues', 'Reescrita de frases', 'Texto (racismo e machismo)

Em 1988, ano do centenário da abolição da escravatura no Brasil, foi promulgada a atual Constituição Federal, a primeira a tratar da questão racial e a que tornou o racismo crime inafiançável e imprescritível. Naquele ano de memória e avanço civilizatório, foi feita uma pequena pesquisa sobre racismo. Seus resultados mostravam um cenário contraditório: ao mesmo tempo em que 97% dos entrevistados afirmavam não ter preconceito racial, 98% dos entrevistados diziam conhecer pessoas racistas e ter presenciado situações de discriminação racial. A melhor descrição da situação foi feita anos depois pela historiadora e antropóloga Lilia Moritz Schwarcz: “A conclusão informal é de que todo brasileiro parece se sentir como uma ilha de democracia racial, cercado de racistas por todos os lados.”

Hoje, o debate sobre o racismo cresceu. As cotas raciais são um sucesso social e acadêmico comprovado. Tendem a ser cada vez menos numerosos os que acreditam na democracia racial e cada vez maior o número dos que sabem que o racismo deve ser extirpado.

Entretanto, a tendência de reconhecer mais o racismo não se repete em relação ao machismo. Todos reconhecem que há discriminação contra pretos e pardos, mas não contra as mulheres; todos reconhecem que há racismo, mas não reconhecem que há machismo — embora os mais jovens não se revelem machistas. Todas as gerações negam a discriminação contra as mulheres, apesar de a geração dos que nasceram no novo milênio ser a que menos percebe a discriminação de gênero, tanto mulheres quanto homens. No Brasil de hoje, há uma regra social implícita, segundo a qual ninguém pode deixar de reconhecer o racismo, mas a sociedade não reconhece a discriminação contra a mulher como relevante.

Felipe Nunes. Brasil no espelho: um guia para entender o Brasil e os brasileiros. Rio de Janeiro: Globo, 2025, p. 185-186 (com adaptações).

Julgue o próximo item, relativo ao texto precedente.

Nos trechos “reconhecem que há discriminação” e “reconhecem que há machismo” (segundo período do terceiro parágrafo), a substituição do segmento “que há” por a existência de manteria tanto a correção gramatical quanto o paralelismo sintático no período.', '["Certo","Errado"]'::jsonb, 0, 'Certo. "Reconhecem a existência de discriminação" e "reconhecem a existência de machismo" são corretas e têm a mesma estrutura: o paralelismo se mantém.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":21}'::jsonb, 2, 'ativa'),
  ('cd25-022', 'portugues', 'Interpretação de texto', 'Texto (racismo e machismo)

Em 1988, ano do centenário da abolição da escravatura no Brasil, foi promulgada a atual Constituição Federal, a primeira a tratar da questão racial e a que tornou o racismo crime inafiançável e imprescritível. Naquele ano de memória e avanço civilizatório, foi feita uma pequena pesquisa sobre racismo. Seus resultados mostravam um cenário contraditório: ao mesmo tempo em que 97% dos entrevistados afirmavam não ter preconceito racial, 98% dos entrevistados diziam conhecer pessoas racistas e ter presenciado situações de discriminação racial. A melhor descrição da situação foi feita anos depois pela historiadora e antropóloga Lilia Moritz Schwarcz: “A conclusão informal é de que todo brasileiro parece se sentir como uma ilha de democracia racial, cercado de racistas por todos os lados.”

Hoje, o debate sobre o racismo cresceu. As cotas raciais são um sucesso social e acadêmico comprovado. Tendem a ser cada vez menos numerosos os que acreditam na democracia racial e cada vez maior o número dos que sabem que o racismo deve ser extirpado.

Entretanto, a tendência de reconhecer mais o racismo não se repete em relação ao machismo. Todos reconhecem que há discriminação contra pretos e pardos, mas não contra as mulheres; todos reconhecem que há racismo, mas não reconhecem que há machismo — embora os mais jovens não se revelem machistas. Todas as gerações negam a discriminação contra as mulheres, apesar de a geração dos que nasceram no novo milênio ser a que menos percebe a discriminação de gênero, tanto mulheres quanto homens. No Brasil de hoje, há uma regra social implícita, segundo a qual ninguém pode deixar de reconhecer o racismo, mas a sociedade não reconhece a discriminação contra a mulher como relevante.

Felipe Nunes. Brasil no espelho: um guia para entender o Brasil e os brasileiros. Rio de Janeiro: Globo, 2025, p. 185-186 (com adaptações).

Julgue o próximo item, relativo ao texto precedente.

Infere-se dos resultados da pesquisa realizada em 1988 sobre racismo que os entrevistados implicitamente negavam fazer parte do coletivo a que pertenciam.', '["Certo","Errado"]'::jsonb, 0, 'Certo. Quase todos diziam não ter preconceito, mas conhecer racistas: cada um se via fora do grupo racista, como "uma ilha de democracia racial, cercado de racistas".', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":22}'::jsonb, 2, 'ativa'),
  ('cd25-023', 'portugues', 'Interpretação de texto', 'Texto (racismo e machismo)

Em 1988, ano do centenário da abolição da escravatura no Brasil, foi promulgada a atual Constituição Federal, a primeira a tratar da questão racial e a que tornou o racismo crime inafiançável e imprescritível. Naquele ano de memória e avanço civilizatório, foi feita uma pequena pesquisa sobre racismo. Seus resultados mostravam um cenário contraditório: ao mesmo tempo em que 97% dos entrevistados afirmavam não ter preconceito racial, 98% dos entrevistados diziam conhecer pessoas racistas e ter presenciado situações de discriminação racial. A melhor descrição da situação foi feita anos depois pela historiadora e antropóloga Lilia Moritz Schwarcz: “A conclusão informal é de que todo brasileiro parece se sentir como uma ilha de democracia racial, cercado de racistas por todos os lados.”

Hoje, o debate sobre o racismo cresceu. As cotas raciais são um sucesso social e acadêmico comprovado. Tendem a ser cada vez menos numerosos os que acreditam na democracia racial e cada vez maior o número dos que sabem que o racismo deve ser extirpado.

Entretanto, a tendência de reconhecer mais o racismo não se repete em relação ao machismo. Todos reconhecem que há discriminação contra pretos e pardos, mas não contra as mulheres; todos reconhecem que há racismo, mas não reconhecem que há machismo — embora os mais jovens não se revelem machistas. Todas as gerações negam a discriminação contra as mulheres, apesar de a geração dos que nasceram no novo milênio ser a que menos percebe a discriminação de gênero, tanto mulheres quanto homens. No Brasil de hoje, há uma regra social implícita, segundo a qual ninguém pode deixar de reconhecer o racismo, mas a sociedade não reconhece a discriminação contra a mulher como relevante.

Felipe Nunes. Brasil no espelho: um guia para entender o Brasil e os brasileiros. Rio de Janeiro: Globo, 2025, p. 185-186 (com adaptações).

Julgue o próximo item, relativo ao texto precedente.

Depreende-se da leitura do texto que a geração dos nascidos no novo milênio é menos afetada pela discriminação de gênero que as demais.', '["Certo","Errado"]'::jsonb, 1, 'Errado. O texto diz que essa geração é a que menos percebe a discriminação de gênero, e não a que menos sofre com ela.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":23}'::jsonb, 2, 'ativa'),
  ('cd25-024', 'portugues', 'Classes de palavras', 'Texto (racismo e machismo)

Em 1988, ano do centenário da abolição da escravatura no Brasil, foi promulgada a atual Constituição Federal, a primeira a tratar da questão racial e a que tornou o racismo crime inafiançável e imprescritível. Naquele ano de memória e avanço civilizatório, foi feita uma pequena pesquisa sobre racismo. Seus resultados mostravam um cenário contraditório: ao mesmo tempo em que 97% dos entrevistados afirmavam não ter preconceito racial, 98% dos entrevistados diziam conhecer pessoas racistas e ter presenciado situações de discriminação racial. A melhor descrição da situação foi feita anos depois pela historiadora e antropóloga Lilia Moritz Schwarcz: “A conclusão informal é de que todo brasileiro parece se sentir como uma ilha de democracia racial, cercado de racistas por todos os lados.”

Hoje, o debate sobre o racismo cresceu. As cotas raciais são um sucesso social e acadêmico comprovado. Tendem a ser cada vez menos numerosos os que acreditam na democracia racial e cada vez maior o número dos que sabem que o racismo deve ser extirpado.

Entretanto, a tendência de reconhecer mais o racismo não se repete em relação ao machismo. Todos reconhecem que há discriminação contra pretos e pardos, mas não contra as mulheres; todos reconhecem que há racismo, mas não reconhecem que há machismo — embora os mais jovens não se revelem machistas. Todas as gerações negam a discriminação contra as mulheres, apesar de a geração dos que nasceram no novo milênio ser a que menos percebe a discriminação de gênero, tanto mulheres quanto homens. No Brasil de hoje, há uma regra social implícita, segundo a qual ninguém pode deixar de reconhecer o racismo, mas a sociedade não reconhece a discriminação contra a mulher como relevante.

Felipe Nunes. Brasil no espelho: um guia para entender o Brasil e os brasileiros. Rio de Janeiro: Globo, 2025, p. 185-186 (com adaptações).

Julgue o próximo item, relativo ao texto precedente.

No trecho “a primeira a tratar da questão racial e a que tornou o racismo crime” (primeiro período do texto), a conjunção “e” liga por adição duas orações adjetivas introduzidas pela preposição “a”.', '["Certo","Errado"]'::jsonb, 1, 'Errado. Em "a primeira a tratar", o "a" é preposição. Mas em "a que tornou", o "a" equivale a "aquela" (pronome), seguido do relativo "que". Não são duas orações introduzidas pela preposição "a".', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":24}'::jsonb, 3, 'ativa'),
  ('cd25-026', 'portugues', 'Reescrita de frases', 'Texto (racismo e machismo)

Em 1988, ano do centenário da abolição da escravatura no Brasil, foi promulgada a atual Constituição Federal, a primeira a tratar da questão racial e a que tornou o racismo crime inafiançável e imprescritível. Naquele ano de memória e avanço civilizatório, foi feita uma pequena pesquisa sobre racismo. Seus resultados mostravam um cenário contraditório: ao mesmo tempo em que 97% dos entrevistados afirmavam não ter preconceito racial, 98% dos entrevistados diziam conhecer pessoas racistas e ter presenciado situações de discriminação racial. A melhor descrição da situação foi feita anos depois pela historiadora e antropóloga Lilia Moritz Schwarcz: “A conclusão informal é de que todo brasileiro parece se sentir como uma ilha de democracia racial, cercado de racistas por todos os lados.”

Hoje, o debate sobre o racismo cresceu. As cotas raciais são um sucesso social e acadêmico comprovado. Tendem a ser cada vez menos numerosos os que acreditam na democracia racial e cada vez maior o número dos que sabem que o racismo deve ser extirpado.

Entretanto, a tendência de reconhecer mais o racismo não se repete em relação ao machismo. Todos reconhecem que há discriminação contra pretos e pardos, mas não contra as mulheres; todos reconhecem que há racismo, mas não reconhecem que há machismo — embora os mais jovens não se revelem machistas. Todas as gerações negam a discriminação contra as mulheres, apesar de a geração dos que nasceram no novo milênio ser a que menos percebe a discriminação de gênero, tanto mulheres quanto homens. No Brasil de hoje, há uma regra social implícita, segundo a qual ninguém pode deixar de reconhecer o racismo, mas a sociedade não reconhece a discriminação contra a mulher como relevante.

Felipe Nunes. Brasil no espelho: um guia para entender o Brasil e os brasileiros. Rio de Janeiro: Globo, 2025, p. 185-186 (com adaptações).

Julgue o próximo item, relativo ao texto precedente.

Os dois primeiros períodos do segundo parágrafo poderiam ser reescritos em um único período, sem prejuízo da correção gramatical e da coerência do texto, da seguinte forma: Atualmente, considerando o avanço do debate sobre o racismo, as cotas raciais já são aceitas como um sucesso social e acadêmico.', '["Certo","Errado"]'::jsonb, 1, 'Errado. A reescrita cria uma relação de causa que o texto não tem (as cotas seriam aceitas por causa do debate) e troca "sucesso comprovado" por "aceitas como sucesso". O sentido muda.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":26}'::jsonb, 2, 'ativa'),
  ('cd25-037', 'rlm', 'Lógica proposicional', 'P: “Maria pagou e não assistiu.”
Q: “João assistiu sem pagar.”

No que concerne às proposições P e Q apresentadas anteriormente, julgue o item seguinte.

A falsidade da proposição “Se P, então Q” permite que se infira corretamente que João não assistiu.', '["Certo","Errado"]'::jsonb, 1, 'Errado. "Se P, então Q" só é falsa com P verdadeira e Q falsa. Q falsa ("João assistiu e não pagou" é falsa) significa que João não assistiu OU pagou. Não dá para saber qual: não se conclui que ele não assistiu.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":37}'::jsonb, 2, 'ativa'),
  ('cd25-038', 'rlm', 'Lógica: negação', 'P: “Maria pagou e não assistiu.”
Q: “João assistiu sem pagar.”

No que concerne às proposições P e Q apresentadas anteriormente, julgue o item seguinte.

A proposição P é a negação de “Se Maria pagou, então assistiu.”.', '["Certo","Errado"]'::jsonb, 0, 'Certo. A negação de "Se A, então B" é "A e não B". Logo, a negação de "Se Maria pagou, então assistiu" é "Maria pagou e não assistiu", que é P.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":38}'::jsonb, 1, 'ativa'),
  ('cd25-039', 'rlm', 'Lógica: tabela-verdade', 'P: “Maria pagou e não assistiu.”
Q: “João assistiu sem pagar.”

No que concerne às proposições P e Q apresentadas anteriormente, julgue o item seguinte.

A tabela-verdade associada à proposição Q tem 8 linhas.', '["Certo","Errado"]'::jsonb, 1, 'Errado. Q tem duas proposições simples (João assistiu; João pagou). A tabela-verdade tem 2² = 4 linhas, e não 8.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":39}'::jsonb, 1, 'ativa'),
  ('cd25-040', 'rlm', 'Lógica: negação', 'P: “Maria pagou e não assistiu.”
Q: “João assistiu sem pagar.”

No que concerne às proposições P e Q apresentadas anteriormente, julgue o item seguinte.

A negação da proposição Q pode ser expressa por “João não assistiu sem pagar.”.', '["Certo","Errado"]'::jsonb, 0, 'Certo. O "não" antes de todo o trecho "assistiu sem pagar" nega o fato inteiro: não é verdade que João assistiu sem pagar. Isso é a negação de Q.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":40}'::jsonb, 2, 'ativa'),
  ('cd25-041', 'rlm', 'Lógica: negação', 'P: “Maria pagou e não assistiu.”
Q: “João assistiu sem pagar.”

No que concerne às proposições P e Q apresentadas anteriormente, julgue o item seguinte.

A proposição Q é a negação de “Se João assistiu, então ele pagou.”.', '["Certo","Errado"]'::jsonb, 0, 'Certo. A negação de "Se João assistiu, então ele pagou" é "João assistiu e não pagou", ou seja, "João assistiu sem pagar": é Q.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":41}'::jsonb, 1, 'ativa'),
  ('cd25-042', 'rlm', 'Estatística', 'Determinada comissão da Câmara dos Deputados é composta por 12 membros, 2 dos quais são do mesmo partido político. A Mesa da comissão é composta por 4 desses membros, que ocupam os cargos de presidente, vice-presidente, 1.º secretário e 2.º secretário, todos com atribuições específicas, que os distinguem entre si e dos demais membros da comissão. Cada cargo deve ser ocupado por apenas um deputado, vedada a acumulação de cargos. Em certo dia de deliberações, todos os deputados dessa comissão que não participam da Mesa se inscreveram para fazer uma fala. A tabela a seguir apresenta a duração, em minutos, dos discursos dos cinco primeiros deputados a realizarem as suas falas.

Deputado – duração (minutos)
1 – 7
2 – 4
3 – 6
4 – 5
5 – 8

Com base na situação hipotética precedente, julgue o item a seguir.

Considerando-se o tempo médio das falas dos cinco primeiros deputados que discursaram, é correto concluir que, se o sexto deputado levar 7 minutos em seu discurso, a duração média dos discursos aumentará.', '["Certo","Errado"]'::jsonb, 0, 'Certo. A média dos cinco primeiros é (7 + 4 + 6 + 5 + 8) ÷ 5 = 6 minutos. Um valor acima da média (7) faz a média subir: 37 ÷ 6 ≈ 6,17.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":42}'::jsonb, 1, 'ativa'),
  ('cd25-043', 'rlm', 'Estatística', 'Determinada comissão da Câmara dos Deputados é composta por 12 membros, 2 dos quais são do mesmo partido político. A Mesa da comissão é composta por 4 desses membros, que ocupam os cargos de presidente, vice-presidente, 1.º secretário e 2.º secretário, todos com atribuições específicas, que os distinguem entre si e dos demais membros da comissão. Cada cargo deve ser ocupado por apenas um deputado, vedada a acumulação de cargos. Em certo dia de deliberações, todos os deputados dessa comissão que não participam da Mesa se inscreveram para fazer uma fala. A tabela a seguir apresenta a duração, em minutos, dos discursos dos cinco primeiros deputados a realizarem as suas falas.

Deputado – duração (minutos)
1 – 7
2 – 4
3 – 6
4 – 5
5 – 8

Com base na situação hipotética precedente, julgue o item a seguir.

O desvio-padrão dos tempos de fala dos cinco primeiros deputados é superior a 2 minutos.', '["Certo","Errado"]'::jsonb, 1, 'Errado. Com média 6, os desvios são 1, −2, 0, −1 e 2; os quadrados somam 10. A variância é 2 (ou 2,5, dividindo por 4), e o desvio-padrão fica entre 1,4 e 1,6 minuto: menor que 2.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":43}'::jsonb, 2, 'ativa'),
  ('cd25-044', 'rlm', 'Análise combinatória', 'Determinada comissão da Câmara dos Deputados é composta por 12 membros, 2 dos quais são do mesmo partido político. A Mesa da comissão é composta por 4 desses membros, que ocupam os cargos de presidente, vice-presidente, 1.º secretário e 2.º secretário, todos com atribuições específicas, que os distinguem entre si e dos demais membros da comissão. Cada cargo deve ser ocupado por apenas um deputado, vedada a acumulação de cargos. Em certo dia de deliberações, todos os deputados dessa comissão que não participam da Mesa se inscreveram para fazer uma fala. A tabela a seguir apresenta a duração, em minutos, dos discursos dos cinco primeiros deputados a realizarem as suas falas.

Deputado – duração (minutos)
1 – 7
2 – 4
3 – 6
4 – 5
5 – 8

Com base na situação hipotética precedente, julgue o item a seguir.

É possível compor a Mesa de mais de cinco mil maneiras distintas sem que nela estejam presentes nenhum dos dois membros que são do mesmo partido político.', '["Certo","Errado"]'::jsonb, 0, 'Certo. Sem os dois do mesmo partido, sobram 10 membros para 4 cargos diferentes (a ordem importa): 10 × 9 × 8 × 7 = 5.040 maneiras, mais que cinco mil.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":44}'::jsonb, 2, 'ativa'),
  ('cd25-045', 'rlm', 'Probabilidade', 'Determinada comissão da Câmara dos Deputados é composta por 12 membros, 2 dos quais são do mesmo partido político. A Mesa da comissão é composta por 4 desses membros, que ocupam os cargos de presidente, vice-presidente, 1.º secretário e 2.º secretário, todos com atribuições específicas, que os distinguem entre si e dos demais membros da comissão. Cada cargo deve ser ocupado por apenas um deputado, vedada a acumulação de cargos. Em certo dia de deliberações, todos os deputados dessa comissão que não participam da Mesa se inscreveram para fazer uma fala. A tabela a seguir apresenta a duração, em minutos, dos discursos dos cinco primeiros deputados a realizarem as suas falas.

Deputado – duração (minutos)
1 – 7
2 – 4
3 – 6
4 – 5
5 – 8

Com base na situação hipotética precedente, julgue o item a seguir.

Se os cargos da Mesa fossem preenchidos por escolha aleatória entre os membros da comissão, a probabilidade de ambos os membros que são do mesmo partido político integrarem a Mesa seria superior a 10%.', '["Certo","Errado"]'::jsonb, 1, 'Errado. Grupos de 4 entre 12: C(12,4) = 495. Grupos com os dois do partido: escolher os outros 2 entre 10, C(10,2) = 45. Probabilidade = 45 ÷ 495 = 1/11 ≈ 9,1%, menos de 10%.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":45}'::jsonb, 3, 'ativa'),
  ('cd25-046', 'rlm', 'Estatística', 'Determinada comissão da Câmara dos Deputados é composta por 12 membros, 2 dos quais são do mesmo partido político. A Mesa da comissão é composta por 4 desses membros, que ocupam os cargos de presidente, vice-presidente, 1.º secretário e 2.º secretário, todos com atribuições específicas, que os distinguem entre si e dos demais membros da comissão. Cada cargo deve ser ocupado por apenas um deputado, vedada a acumulação de cargos. Em certo dia de deliberações, todos os deputados dessa comissão que não participam da Mesa se inscreveram para fazer uma fala. A tabela a seguir apresenta a duração, em minutos, dos discursos dos cinco primeiros deputados a realizarem as suas falas.

Deputado – duração (minutos)
1 – 7
2 – 4
3 – 6
4 – 5
5 – 8

Com base na situação hipotética precedente, julgue o item a seguir.

Se o sexto deputado levar 7 minutos em seu discurso, a mediana da série das durações dos seis primeiros discursos será maior que a mediana da série das durações dos cinco primeiros discursos.', '["Certo","Errado"]'::jsonb, 0, 'Certo. Em ordem, os cinco tempos são 4, 5, 6, 7, 8: mediana 6. Com o sexto (7): 4, 5, 6, 7, 7, 8, e a mediana é a média dos dois centrais, (6 + 7) ÷ 2 = 6,5, maior que 6.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":46}'::jsonb, 2, 'ativa'),
  ('cd25-047', 'administrativo', 'Organização administrativa', 'No âmbito da Câmara dos Deputados, foi celebrado, nos termos da legislação aplicável, instrumento de cooperação administrativa para que determinadas atividades administrativas internas de apoio institucional, sem caracterização de delegação de serviço público, até então executadas diretamente por unidades internas do órgão, passassem a ser materialmente executadas por fundação pública federal de direito privado, integrante da administração indireta da União. Não houve transferência da titularidade nem da execução de serviço público em sentido próprio, tendo a Câmara dos Deputados permanecido responsável pela direção funcional, pela definição das diretrizes e pelo controle finalístico da atuação. Promoveu-se a redistribuição interna de competências entre secretarias, diretorias e coordenações já existentes, sem criação de novos órgãos, tendo sido mantida a relação de hierarquia administrativa no âmbito da própria Câmara dos Deputados.

Considerando a situação hipotética apresentada e os conceitos de centralização, descentralização, concentração e desconcentração administrativas, julgue o item a seguir.

A redistribuição de competências entre secretarias, diretorias e coordenações da Câmara dos Deputados, realizada no âmbito da mesma pessoa jurídica, sem criação de novos órgãos e com preservação da hierarquia administrativa, configura hipótese de desconcentração administrativa.', '["Certo","Errado"]'::jsonb, 0, 'Certo. Distribuir competências entre órgãos da mesma pessoa jurídica, mantendo a hierarquia, é desconcentração.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":47}'::jsonb, 1, 'ativa'),
  ('cd25-048', 'administrativo', 'Descentralização administrativa', 'No âmbito da Câmara dos Deputados, foi celebrado, nos termos da legislação aplicável, instrumento de cooperação administrativa para que determinadas atividades administrativas internas de apoio institucional, sem caracterização de delegação de serviço público, até então executadas diretamente por unidades internas do órgão, passassem a ser materialmente executadas por fundação pública federal de direito privado, integrante da administração indireta da União. Não houve transferência da titularidade nem da execução de serviço público em sentido próprio, tendo a Câmara dos Deputados permanecido responsável pela direção funcional, pela definição das diretrizes e pelo controle finalístico da atuação. Promoveu-se a redistribuição interna de competências entre secretarias, diretorias e coordenações já existentes, sem criação de novos órgãos, tendo sido mantida a relação de hierarquia administrativa no âmbito da própria Câmara dos Deputados.

Considerando a situação hipotética apresentada e os conceitos de centralização, descentralização, concentração e desconcentração administrativas, julgue o item a seguir.

A execução material, por fundação pública federal de direito privado, de atividades-meio administrativas internas da Câmara dos Deputados, sem transferência da titularidade nem da execução de serviço público em sentido próprio, não configura descentralização administrativa.', '["Certo","Errado"]'::jsonb, 0, 'Certo. Descentralizar é transferir a titularidade ou a execução de um serviço para outra pessoa. No caso, nada disso foi transferido: a fundação só executa atividades de apoio, sob a direção da Câmara, por um instrumento de cooperação.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":48}'::jsonb, 3, 'ativa'),
  ('cd25-049', 'administrativo', 'Administração indireta', 'Julgue o seguinte item, relativo à administração direta e indireta e às entidades da administração indireta.

As fundações públicas, independentemente de sua natureza jurídica, submetem-se integralmente ao regime jurídico de direito público no que se refere à aplicação irrestrita das prerrogativas típicas dos bens públicos.', '["Certo","Errado"]'::jsonb, 1, 'Errado. A fundação pública pode ter personalidade de direito privado; nesse caso, segue um regime misto, e seus bens não têm todas as prerrogativas dos bens públicos.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":49}'::jsonb, 2, 'ativa'),
  ('cd25-050', 'administrativo', 'Administração indireta', 'Julgue o seguinte item, relativo à administração direta e indireta e às entidades da administração indireta.

A administração indireta é composta por pessoas jurídicas com personalidade própria, criadas ou autorizadas por lei, que desempenham atividades administrativas de forma descentralizada, sem subordinação hierárquica ao ente instituidor, estando sujeitas a controle finalístico.', '["Certo","Errado"]'::jsonb, 0, 'Certo. As entidades da administração indireta têm personalidade jurídica própria, são criadas ou autorizadas por lei e não ficam subordinadas ao ente que as criou: sofrem apenas controle finalístico (tutela).', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":50}'::jsonb, 1, 'ativa'),
  ('cd25-051', 'administrativo', 'Administração indireta', 'Julgue o seguinte item, relativo à administração direta e indireta e às entidades da administração indireta.

A criação de empresas públicas e sociedades de economia mista prescinde de autorização legislativa específica se o ente federativo detiver o controle acionário e a entidade atuar em conformidade com o interesse público.', '["Certo","Errado"]'::jsonb, 1, 'Errado. A Constituição (art. 37, XIX) exige lei específica que autorize a criação de empresa pública e de sociedade de economia mista. Ter o controle acionário não dispensa essa lei.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":51}'::jsonb, 1, 'ativa'),
  ('cd25-052', 'administrativo', 'Atos administrativos', 'A respeito do ato administrativo, julgue o item seguinte.

A revogação, por conveniência e oportunidade, do ato administrativo não pode atingir atos válidos que tenham gerado direitos adquiridos, sob pena de violação à segurança jurídica.', '["Certo","Errado"]'::jsonb, 0, 'Certo. A revogação, por conveniência e oportunidade, deve respeitar os direitos adquiridos (Súmula 473 do STF).', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":52}'::jsonb, 1, 'ativa'),
  ('cd25-053', 'administrativo', 'Atos administrativos', 'A respeito do ato administrativo, julgue o item seguinte.

Os atos administrativos vinculados e discricionários distinguem-se quanto à margem de liberdade conferida à administração na apreciação do motivo e do objeto, sendo ambos igualmente submetidos ao controle de legalidade pelo Poder Judiciário.', '["Certo","Errado"]'::jsonb, 0, 'Certo. No ato vinculado, a lei já define motivo e objeto; no discricionário, a administração tem margem de escolha. Os dois estão sujeitos ao controle de legalidade pelo Judiciário.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":53}'::jsonb, 2, 'ativa'),
  ('cd25-054', 'administrativo', 'Atos administrativos', 'A respeito do ato administrativo, julgue o item seguinte.

A imperatividade e a autoexecutoriedade são atributos dos atos administrativos, independentemente de sua natureza e de previsão legal.', '["Certo","Errado"]'::jsonb, 1, 'Errado. Nem todo ato tem esses atributos. Atos enunciativos (certidões, pareceres) não impõem obrigações, e a autoexecutoriedade depende de previsão em lei ou de urgência.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":54}'::jsonb, 2, 'ativa'),
  ('cd25-055', 'administrativo', 'Lei n.º 8.112/1990', 'Maria, servidora pública federal efetiva e estável, ocupante de cargo de analista em órgão da administração direta da União, submetida à Lei n.º 8.112/1990, foi designada, após alguns meses de exercício, para ocupar cargo em comissão no próprio órgão. Posteriormente, requereu licença para tratar de interesses particulares, a qual foi deferida pela autoridade competente, que consignou que o afastamento seria sem remuneração e determinou a exoneração de Maria do cargo em comissão.

Com base na situação hipotética apresentada, julgue o próximo item, considerando as normas aplicáveis aos agentes públicos constantes na Lei n.º 8.112/1990 e na Constituição Federal.

A licença para tratar de interesses particulares constitui direito subjetivo de Maria, e sua concessão independe do interesse da administração.', '["Certo","Errado"]'::jsonb, 1, 'Errado. A licença para tratar de interesses particulares é concedida a critério da administração (art. 91 da Lei n.º 8.112/1990). Não é um direito do servidor.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":55}'::jsonb, 1, 'ativa'),
  ('cd25-056', 'administrativo', 'Lei n.º 8.112/1990', 'Maria, servidora pública federal efetiva e estável, ocupante de cargo de analista em órgão da administração direta da União, submetida à Lei n.º 8.112/1990, foi designada, após alguns meses de exercício, para ocupar cargo em comissão no próprio órgão. Posteriormente, requereu licença para tratar de interesses particulares, a qual foi deferida pela autoridade competente, que consignou que o afastamento seria sem remuneração e determinou a exoneração de Maria do cargo em comissão.

Com base na situação hipotética apresentada, julgue o próximo item, considerando as normas aplicáveis aos agentes públicos constantes na Lei n.º 8.112/1990 e na Constituição Federal.

O período de licença concedido a Maria será computado para fins de aposentadoria da servidora, ainda que não seja considerado tempo de efetivo exercício para outras vantagens funcionais.', '["Certo","Errado"]'::jsonb, 1, 'Errado. Essa licença é sem remuneração e não está entre os afastamentos que a Lei n.º 8.112/1990 manda contar para aposentadoria (arts. 102 e 103).', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":56}'::jsonb, 2, 'ativa'),
  ('cd25-057', 'administrativo', 'Lei n.º 8.112/1990', 'Maria, servidora pública federal efetiva e estável, ocupante de cargo de analista em órgão da administração direta da União, submetida à Lei n.º 8.112/1990, foi designada, após alguns meses de exercício, para ocupar cargo em comissão no próprio órgão. Posteriormente, requereu licença para tratar de interesses particulares, a qual foi deferida pela autoridade competente, que consignou que o afastamento seria sem remuneração e determinou a exoneração de Maria do cargo em comissão.

Com base na situação hipotética apresentada, julgue o próximo item, considerando as normas aplicáveis aos agentes públicos constantes na Lei n.º 8.112/1990 e na Constituição Federal.

Por determinação legal, o deferimento da licença imporia a exoneração automática de Maria do cargo em comissão por ela ocupado.', '["Certo","Errado"]'::jsonb, 1, 'Errado. A lei não prevê exoneração automática do cargo em comissão por causa da licença. A exoneração de cargo em comissão é decisão livre da autoridade, não um efeito obrigatório da licença.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":57}'::jsonb, 2, 'ativa'),
  ('cd25-058', 'administrativo', 'Improbidade administrativa', 'No que se refere à responsabilidade civil do Estado e à improbidade administrativa, julgue o item a seguir.

O servidor público que, de forma negligente, realiza ordenação de despesa não autorizada em lei, com efetiva perda patrimonial, pratica ato de improbidade administrativa que causa prejuízo ao erário.', '["Certo","Errado"]'::jsonb, 1, 'Errado. Desde a Lei n.º 14.230/2021, todo ato de improbidade exige dolo. A conduta apenas negligente (culposa), mesmo com prejuízo, não é improbidade.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":58}'::jsonb, 2, 'ativa'),
  ('cd25-059', 'administrativo', 'Responsabilidade civil do Estado', 'No que se refere à responsabilidade civil do Estado e à improbidade administrativa, julgue o item a seguir.

Em decorrência da teoria do risco administrativo, o Estado possui responsabilidade civil objetiva pelos encargos trabalhistas gerados pelo inadimplemento de empresa prestadora de serviços contratada pela administração pública.', '["Certo","Errado"]'::jsonb, 1, 'Errado. A administração não responde automaticamente pelas dívidas trabalhistas da empresa contratada. Para o STF, só há responsabilidade se ficar provada falha na fiscalização do contrato.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":59}'::jsonb, 2, 'ativa'),
  ('cd25-060', 'administrativo', 'Improbidade administrativa', 'No que se refere à responsabilidade civil do Estado e à improbidade administrativa, julgue o item a seguir.

A mera voluntariedade do agente não é suficiente para configurar a conduta dolosa de improbidade administrativa, sendo necessária a presença da vontade livre e consciente de alcançar o resultado ilícito.', '["Certo","Errado"]'::jsonb, 0, 'Certo. A Lei de Improbidade (art. 1.º, § 2.º) define dolo como a vontade livre e consciente de alcançar o resultado ilícito, e diz que a mera voluntariedade do agente não basta.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":60}'::jsonb, 1, 'ativa'),
  ('cd25-061', 'administrativo', 'Processo administrativo (Lei n.º 9.784/1999)', 'Julgue o item seguinte, com base nas disposições da Lei de Acesso à Informação (Lei n.º 12.527/2011), da Lei Geral de Proteção de Dados (Lei n.º 13.709/2018) e da lei que regula o processo administrativo (Lei n.º 9.784/1999).

No processo administrativo, deve-se observar, entre outros critérios, o de atendimento a fins de interesse geral, permitida a renúncia parcial de poderes ou competências, desde que autorizada por lei.', '["Certo","Errado"]'::jsonb, 0, 'Certo. A Lei n.º 9.784/1999 (art. 2.º, parágrafo único, II) manda atender a fins de interesse geral e veda a renúncia, total ou parcial, de poderes ou competências, salvo autorização em lei.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":61}'::jsonb, 2, 'ativa'),
  ('cd25-062', 'administrativo', 'Processo administrativo (Lei n.º 9.784/1999)', 'Julgue o item seguinte, com base nas disposições da Lei de Acesso à Informação (Lei n.º 12.527/2011), da Lei Geral de Proteção de Dados (Lei n.º 13.709/2018) e da lei que regula o processo administrativo (Lei n.º 9.784/1999).

As regras previstas na lei que regula o processo administrativo federal não se aplicam ao Poder Legislativo da União, ainda que no desempenho de função administrativa.', '["Certo","Errado"]'::jsonb, 1, 'Errado. A lei também se aplica aos órgãos dos Poderes Legislativo e Judiciário da União quando exercem função administrativa (art. 1.º, § 1.º).', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":62}'::jsonb, 1, 'ativa'),
  ('cd25-063', 'administrativo', 'Lei de Acesso à Informação', 'Julgue o item seguinte, com base nas disposições da Lei de Acesso à Informação (Lei n.º 12.527/2011), da Lei Geral de Proteção de Dados (Lei n.º 13.709/2018) e da lei que regula o processo administrativo (Lei n.º 9.784/1999).

Desde que não seja configurada hipótese de informação classificada como sigilosa ou decorrente de sigilo legal, o direito de acesso aos pareceres jurídicos utilizados como fundamento da tomada de decisão e do ato administrativo será assegurado com a edição do ato decisório respectivo.', '["Certo","Errado"]'::jsonb, 0, 'Certo. A LAI (art. 7.º, § 3.º) garante o acesso aos documentos usados como fundamento de uma decisão quando o ato decisório é editado.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":63}'::jsonb, 2, 'ativa'),
  ('cd25-064', 'administrativo', 'Processo administrativo (Lei n.º 9.784/1999)', 'Julgue o item seguinte, com base nas disposições da Lei de Acesso à Informação (Lei n.º 12.527/2011), da Lei Geral de Proteção de Dados (Lei n.º 13.709/2018) e da lei que regula o processo administrativo (Lei n.º 9.784/1999).

No âmbito do processo administrativo regulado pela Lei n.º 9.784/1999, as sanções podem ter natureza pecuniária ou consistir em obrigação de fazer ou de não fazer.', '["Certo","Errado"]'::jsonb, 0, 'Certo. Pelo art. 68 da Lei n.º 9.784/1999, as sanções terão natureza pecuniária ou consistirão em obrigação de fazer ou de não fazer, sempre com direito de defesa.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":64}'::jsonb, 1, 'ativa'),
  ('cd25-065', 'administrativo', 'Lei de Acesso à Informação', 'Julgue o item seguinte, com base nas disposições da Lei de Acesso à Informação (Lei n.º 12.527/2011), da Lei Geral de Proteção de Dados (Lei n.º 13.709/2018) e da lei que regula o processo administrativo (Lei n.º 9.784/1999).

É condição para a realização do pedido de acesso a informações a apresentação de exposição de motivos.', '["Certo","Errado"]'::jsonb, 1, 'Errado. A LAI proíbe exigir do cidadão os motivos do pedido de informação (art. 10, § 3.º).', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":65}'::jsonb, 1, 'ativa'),
  ('cd25-066', 'informatica', 'Proteção de dados (LGPD)', 'Julgue o item seguinte, com base nas disposições da Lei de Acesso à Informação (Lei n.º 12.527/2011), da Lei Geral de Proteção de Dados (Lei n.º 13.709/2018) e da lei que regula o processo administrativo (Lei n.º 9.784/1999).

A Lei Geral de Proteção de Dados aplica-se ao tratamento de dados pessoais realizado para fins exclusivamente jornalísticos e para fins exclusivos de atividades de repressão a infrações penais.', '["Certo","Errado"]'::jsonb, 1, 'Errado. A LGPD não se aplica ao tratamento de dados feito exclusivamente para fins jornalísticos nem exclusivamente para a repressão de infrações penais (art. 4.º).', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":66}'::jsonb, 1, 'ativa'),
  ('cd25-067', 'informatica', 'Proteção de dados (LGPD)', 'Julgue o item seguinte, com base nas disposições da Lei de Acesso à Informação (Lei n.º 12.527/2011), da Lei Geral de Proteção de Dados (Lei n.º 13.709/2018) e da lei que regula o processo administrativo (Lei n.º 9.784/1999).

A Agência Nacional de Proteção de Dados (ANPD), autarquia de natureza especial dotada de autonomia funcional, técnica, decisória, administrativa e financeira, possui competência sancionatória em caso de tratamento de dados realizado em descumprimento à legislação.', '["Certo","Errado"]'::jsonb, 0, 'Certo. A ANPD é autarquia de natureza especial, com autonomia, e cabe a ela aplicar sanções a quem trata dados em desacordo com a LGPD.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":67}'::jsonb, 2, 'ativa'),
  ('cd25-068', 'administrativo', 'Controle da administração', 'Julgue o item subsequente, relativo ao controle da administração pública.

A sustação, pelo Congresso Nacional, de portaria normativa editada por ministro de Estado, em razão de violação ao princípio da legalidade, configura um tipo de controle legislativo, político e externo da administração pública.', '["Certo","Errado"]'::jsonb, 0, 'Certo. O Congresso pode sustar atos normativos do Executivo que exorbitem do poder regulamentar (art. 49, V, da Constituição). É controle legislativo, político e externo.', '{"tipo":"oficial","banca":"Cebraspe","orgao":"Câmara dos Deputados","cargo":"Analista Legislativo e Técnico Legislativo","ano":2025,"prova":"cd-2025-cg","item":68}'::jsonb, 2, 'ativa')
ON CONFLICT (id) DO NOTHING;
