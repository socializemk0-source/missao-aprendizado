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

## Formatos

| Arquivo | Uso |
|---|---|
| `aprova-tico-anuncio-9x16.mp4` (1080×1920) | Reels, Stories, TikTok. O conteúdo fica entre y=210 e y=1710, longe da legenda e dos botões do Reels |
| `aprova-tico-anuncio-4x5.mp4` (1080×1350) | Feed do Instagram e do Facebook |
| `aprova-tico-anuncio-1x1.mp4` (1080×1080) | Feed, carrossel, coluna da direita |

## Gerar de novo

```bash
python3 marketing/video-anuncio/musica.py                 # trilha (numpy + ffmpeg)
node marketing/video-anuncio/render.mjs                   # os 3 formatos (~2 min)
node marketing/video-anuncio/render.mjs --sheet           # folhas de conferência
```

Precisa de `playwright` com Chromium e `ffmpeg`. Se o playwright estiver
instalado globalmente: `PLAYWRIGHT_PATH=$(npm root -g)/playwright/index.mjs`.
Os vídeos saem em `saida/` (fora do git: só o código-fonte fica no repositório).

Para ver a animação ao vivo, abra `anuncio.html?h=1920` no navegador (toca em loop).
Para mudar um texto, edite o HTML e grave de novo.

As fontes (Baloo 2 e Nunito) estão em `fonts/`, com licença SIL OFL.
