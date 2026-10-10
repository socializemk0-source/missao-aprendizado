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

## Formatos

| Arquivo | Uso |
|---|---|
| `aprova-tico-{anuncio,onibus,caverna}-9x16.mp4` (1080×1920) | Reels, Stories, TikTok. O conteúdo fica entre y=210 e y=1710, longe da legenda e dos botões do Reels |
| `aprova-tico-{anuncio,onibus,caverna}-4x5.mp4` (1080×1350) | Feed do Instagram e do Facebook |
| `aprova-tico-{anuncio,onibus,caverna}-1x1.mp4` (1080×1080) | Feed, carrossel, coluna da direita |

## Gerar de novo

```bash
python3 marketing/video-anuncio/musica.py                 # trilha (numpy + ffmpeg)
node marketing/video-anuncio/render.mjs                   # os 3 formatos (~2 min)
node marketing/video-anuncio/render.mjs --sheet           # folhas de conferência

python3 marketing/video-anuncio/musica.py onibus          # vídeo do ônibus
node marketing/video-anuncio/render.mjs --page onibus

python3 marketing/video-anuncio/musica.py caverna         # vídeo da caverna
node marketing/video-anuncio/render.mjs --page caverna
```

Precisa de `playwright` com Chromium (com WebGL; o render.mjs passa `--allow-file-access-from-files`) e `ffmpeg`. Se o playwright estiver
instalado globalmente: `PLAYWRIGHT_PATH=$(npm root -g)/playwright/index.mjs`.
Os vídeos saem em `saida/` (fora do git: só o código-fonte fica no repositório).

Para ver a animação ao vivo, abra `anuncio.html?h=1920` no navegador (toca em loop).
Para mudar um texto, edite o HTML e grave de novo.

As fontes (Baloo 2 e Nunito) estão em `fonts/`, com licença SIL OFL.
