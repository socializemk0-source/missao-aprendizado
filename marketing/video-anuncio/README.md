# Vídeo de anúncio do Aprova Tico

Vídeo de 24 s para Facebook Ads, Instagram (feed, Reels e Stories) e TikTok,
feito em código: a animação é um HTML em que cada quadro é calculado a partir
do tempo (`seek(t)`), gravada quadro a quadro no Chromium e montada com ffmpeg.
A trilha é sintetizada em `musica.py` (sem música de terceiros, livre para
anúncio). Método inspirado em `yihui-dev/awesome-opus5-5-videos`.

## Roteiro (120 BPM, cada corte numa batida)

| Tempo | Cena | Texto na tela |
|---|---|---|
| 0–4 s | Gancho: Tico confuso | "Estuda, estuda, estuda... e na hora da prova esquece tudo?" |
| 4–6 s | Caos de materiais (PDF, edital, videoaula...) | "Não sabe por onde começar?" |
| 6–10 s | Círculo abre na ilustração do Tico | "Aprova Tico. Sua aprovação, uma fase de cada vez." |
| 10–16 s | Celular: dedo escolhe 75%, confere, +10 XP | "Responda, confira, entenda." |
| 16–20 s | Recursos entram um por batida + "7 dias seguidos!" | "Estudar vira aventura" |
| 20–24 s | Chamada com confete | "Comece grátis · Sem cartão de crédito · aprovatico.com.br" |

A questão do celular é a mesma da demonstração da landing (autoral). Os
textos repetem o que a landing já promete; nada de número de aprovados ou
resultado que o app não mostra.

## Segundo vídeo: o Tico no ônibus (`onibus.html`)

Desenho tipo cartoon: o Tico, de pé num ônibus lotado, passa de fase pelo
celular no caminho. Passageiros desenhados em formas simples (ninguém real).

| Tempo | Cena | Texto na tela |
|---|---|---|
| 0–4 s | Ônibus na rua; a câmera entra pela janela do Tico | "Sem tempo pra estudar?" · "7h12 · 40 minutos de ônibus" |
| 4–8 s | Dentro do ônibus lotado, com trancos nos buracos | "Ônibus lotado? Dá pra passar de fase." |
| 8–14 s | Tela do celular: questão de crase (`pt-crase-1`, autoral da trilha), acerto, "Fase concluída!" | "Responde no caminho, aprende no caminho." |
| 14–18 s | Tico comemora, sequência de dias, placa "Próxima parada: sua aprovação" | "Fase concluída antes de descer." |
| 18–20 s | No ônibus, na fila, no intervalo | "Estude onde der com o Tico do lado." |
| 20–24 s | Chamada igual à do primeiro vídeo | "Comece grátis · aprovatico.com.br" |

A trilha tem motor do ônibus, tranco nos buracos e campainha de parada.

## Terceiro vídeo: homens das cavernas (`caverna.html`)

Cartoon cômico, 26 s. Dois "homens das cavernas" estudam do jeito antigo; o
Tico chega por um portal com óculos de realidade aumentada e o app; na
revelação, eram só pessoas comuns que não conheciam o Aprova Tico.

| Tempo | Cena | Texto na tela |
|---|---|---|
| 0–6 s | Um talha "CRAZI" na pedra (e a pedra racha); o outro é soterrado pelas "apostilas de pedra"; clava na cabeça para decorar | "Estudando do jeito antigo?" · "Horas na pedra e nada fica." |
| 6–9 s | Portal neon, o Tico chega de skate voador e pousa na mesa; os dois pulam de susto | "UGA?!" · "Ou do jeito Aprova Tico." |
| 9–15 s | Holograma com a questão da landing; o braço estica e toca 75%; "Acertou! +10 XP"; trilha guiada, explicação na hora, revisão dos erros | "UGA!!" |
| 15–20 s | A música para; peruca e barba voam, a fumaça baixa, o cenário da caverna sai e aparece uma sala de estudo | "Peraí..." · "Não eram das cavernas. Só não conheciam o Aprova Tico." |
| 20–26 s | Chamada | "Saia da idade da pedra" · "Comece grátis · sem cartão de crédito" · aprovatico.com.br |

O Tico se mexe pela marionete `tico-rig.js`: a arte oficial é deformada numa
malha no WebGL (cabeça vira e acena com o pescoço acompanhando, braço balança,
piscada, óculos de realidade aumentada), sem redesenhar o personagem. As
pessoas são desenho próprio, articulado (cabeça, braços, peruca, barba e
fantasia separadas). A trilha tem tambores, martelo na pedra, "bonk" na
clava, portal, arranhão de disco e fumaça.

## Série "Desafio do Tico" (`desafio.html`)

16 s, feito para gerar comentários: quem estuda para concurso para para
responder. Cada vídeo é uma questão autoral da trilha (`?q=`), com o texto
igual ao de `content/questoes/*.ts`.

| Tempo | Cena |
|---|---|
| 0–1,5 s | "Você acerta essa?" e a matéria; o Tico aponta |
| 1,5–4 s | A questão e as alternativas, uma por batida |
| 4–7 s | Contagem 3-2-1 com relógio, "Comenta sua resposta!", o Tico nervoso |
| 7–12 s | "TEMPO!", a certa fica verde, as erradas são riscadas; explicação visual passo a passo |
| 12–16 s | "Toda questão vem com explicação assim." · Aprova Tico · Comece grátis · aprovatico.com.br |

| `--q` | Questão | Pegadinha |
|---|---|---|
| `pt-acent-4` | Qual palavra é proparoxítona? | "rúbrica" e "récorde" |
| `rlm-eq-1` | "Se estudo, então passo" equivale a... | contrapositiva |
| `pt-crase-1` | Onde a crase está certa? | "Fui à Brasília" |
| `rlm-porc-3` | +20% e depois −20% volta ao preço? (C/E) | fica 4% menor |
| `inf-plan-1` | =SOMA(A1:A10) ou =SOMA(A1;A10)? | dois-pontos × ponto e vírgula |
| `const-rem-1` | Remédio do direito de ir e vir | habeas corpus |
| `rlm-porc-2` | Dois aumentos de 10% em R$ 2.000 | não é R$ 2.400 |
| `adm-ato-3` | Retirar ato válido por conveniência | revogação × anulação |

Para uma questão nova, acrescente-a em `questoes-desafio.js` (copiando
enunciado, alternativas e gabarito do arquivo da trilha) e grave com `--q`.
Só questões autorais ou de provas oficiais conferidas, e nada de números
inventados ("87% erram").

## Vídeo cômico "o edital gigante" (`edital.html`)

16 s: o Tico abre o edital, ele desenrola sem fim ("pág. 134 de 134") e o
soterra; ele salta com os óculos, as folhas viram a trilha e ele anda até a
fase de hoje. "A trilha mostra o próximo passo." · "Uma fase de cada vez."
O edital é genérico (nenhum órgão real).

## Posts, Stories e a pasta do calendário

- `calendario.json`: as 52 peças das 4 semanas (12/out a 8/nov), as mesmas do
  calendário publicado em https://claude.ai/artifact/EArNMoTDAhYfFuaS9fw7Xu
- `pecas.html`: carrosséis e estáticos (1080×1350) e Stories (1080×1920).
  Telas do app são ilustrações do Tico, não prints; números de exemplo vêm
  marcados como exemplo.
- `questoes-desafio.js`: as questões da série (vídeo, Stories e carrosséis).
- `montar-pasta.mjs`: grava as imagens, copia os vídeos de `saida/` e monta
  `saida/Criativos Aprova Tico/` (uma pasta por semana, um .txt por peça com
  legenda, links com UTM e o texto das figurinhas) e o .zip.

```bash
node marketing/video-anuncio/montar-pasta.mjs
```

## Formatos

| Arquivo | Uso |
|---|---|
| `aprova-tico-{anuncio,onibus,caverna,desafio-<questão>}-9x16.mp4` (1080×1920) | Reels, Stories, TikTok. O conteúdo fica entre y=210 e y=1710, longe da legenda e dos botões do Reels |
| `aprova-tico-{...}-4x5.mp4` (1080×1350) | Feed do Instagram e do Facebook |
| `aprova-tico-{...}-1x1.mp4` (1080×1080) | Feed, carrossel, coluna da direita |

## Gerar de novo

```bash
python3 marketing/video-anuncio/musica.py                 # trilha (numpy + ffmpeg)
node marketing/video-anuncio/render.mjs                   # os 3 formatos (~2 min)
node marketing/video-anuncio/render.mjs --sheet           # folhas de conferência

python3 marketing/video-anuncio/musica.py onibus          # vídeo do ônibus
node marketing/video-anuncio/render.mjs --page onibus

python3 marketing/video-anuncio/musica.py caverna         # vídeo da caverna
node marketing/video-anuncio/render.mjs --page caverna

python3 marketing/video-anuncio/musica.py desafio         # série Desafio do Tico
node marketing/video-anuncio/render.mjs --page desafio --q pt-acent-4

python3 marketing/video-anuncio/musica.py edital          # o edital gigante
node marketing/video-anuncio/render.mjs --page edital --formats 9x16
```

Precisa de `playwright` com Chromium (com WebGL; o render.mjs passa `--allow-file-access-from-files`) e `ffmpeg`. Se o playwright estiver
instalado globalmente: `PLAYWRIGHT_PATH=$(npm root -g)/playwright/index.mjs`.
Os vídeos saem em `saida/` (fora do git: só o código-fonte fica no repositório).

Para ver a animação ao vivo, abra `anuncio.html?h=1920` no navegador (toca em loop).
Para mudar um texto, edite o HTML e grave de novo.

As fontes (Baloo 2 e Nunito) estão em `fonts/`, com licença SIL OFL.
