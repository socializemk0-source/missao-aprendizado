// Grava o anúncio quadro a quadro (Chromium sem tela) e monta o MP4 com ffmpeg.
//
//   node marketing/video-anuncio/render.mjs                 -> 9x16, 4x5 e 1x1
//   node marketing/video-anuncio/render.mjs --formats 9x16  -> só um formato
//   node marketing/video-anuncio/render.mjs --sheet         -> só a folha de conferência (PNG)
//   node marketing/video-anuncio/render.mjs --page onibus   -> o anúncio do ônibus (padrão: anuncio)
//
// Precisa de: playwright (com Chromium), ffmpeg e a trilha gerada por musica.py
// (python3 marketing/video-anuncio/musica.py). Saída em marketing/video-anuncio/saida/.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, 'saida');
mkdirSync(OUT, { recursive: true });

const FORMATOS = { '9x16': [1080, 1920], '4x5': [1080, 1350], '1x1': [1080, 1080] };
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const formatos = opt('--formats', Object.keys(FORMATOS).join(',')).split(',');
const FPS = Number(opt('--fps', 30));
const SHEET = args.includes('--sheet');
const PAGE = opt('--page', 'anuncio');
const AUDIO = join(DIR, 'saida', PAGE === 'anuncio' ? 'trilha.wav' : `trilha-${PAGE}.wav`);
const NOME = PAGE === 'anuncio' ? 'aprova-tico-anuncio' : `aprova-tico-${PAGE}`;

const run = (cmd, argv, input) => new Promise((resolve, reject) => {
  const p = spawn(cmd, argv, { stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
  p.on('error', reject);
  p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} saiu com ${code}`))));
  if (input) input(p.stdin);
});

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function abrir(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${pathToFileURL(join(DIR, `${PAGE}.html`))}?w=${w}&h=${h}`);
  await page.evaluate(() => window.ready);
  return page;
}
const quadro = async (page, t, type = 'jpeg') => {
  await page.evaluate((tt) => window.seek(tt), t);
  return page.screenshot({ type, quality: type === 'jpeg' ? 95 : undefined, clip: undefined });
};

for (const f of formatos) {
  const [w, h] = FORMATOS[f];
  const page = await abrir(w, h);
  const dur = await page.evaluate(() => window.DURATION);

  if (SHEET) {
    // Um quadro por marca de tempo, lado a lado, para conferir antes de gravar tudo.
    const tempos = (opt('--times', '1.6,3.4,5.2,7.6,9.5,11.9,13.2,14.5,18,19.6,20.6,23.5')).split(',').map(Number);
    const dir = join(OUT, `sheet-${PAGE}-${f}`);
    mkdirSync(dir, { recursive: true });
    for (const [i, t] of tempos.entries()) {
      const buf = await quadro(page, t, 'png');
      await import('node:fs').then((fs) => fs.writeFileSync(join(dir, `${String(i).padStart(2, '0')}.png`), buf));
    }
    const cols = 6, sw = 360, sh = Math.round((h / w) * sw);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', join(dir, '%02d.png'),
      '-vf', `scale=${sw}:${sh},tile=${cols}x${Math.ceil(tempos.length / cols)}:padding=8:color=white`, '-frames:v', '1', join(OUT, `sheet-${PAGE}-${f}.png`)]);
    console.log(`folha: saida/sheet-${PAGE}-${f}.png`);
    await page.close();
    continue;
  }

  const total = Math.round(dur * FPS);
  const mp4 = join(OUT, `${NOME}-${f}.mp4`);
  const temAudio = existsSync(AUDIO);
  const ff = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (temAudio) ff.push('-i', AUDIO);
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart');
  if (temAudio) ff.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push(mp4);
  const inicio = Date.now();
  await run('ffmpeg', ff, async (stdin) => {
    for (let i = 0; i < total; i++) {
      const buf = await quadro(page, i / FPS);
      if (!stdin.write(buf)) await new Promise((r) => stdin.once('drain', r));
      if (i % (FPS * 4) === 0) console.log(`${f}: ${(i / FPS).toFixed(0)}s de ${dur}s`);
    }
    stdin.end();
  });
  console.log(`${f}: pronto em ${((Date.now() - inicio) / 1000).toFixed(0)}s -> saida/${mp4.split('/').pop()}${temAudio ? '' : ' (sem áudio: rode musica.py antes)'}`);
  await page.close();
}
await browser.close();
