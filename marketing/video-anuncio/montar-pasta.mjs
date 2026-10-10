// Monta a pasta de criativos do calendário (calendario.json): uma pasta por
// semana, cada peça com o prefixo do dia, e um .txt ao lado com legenda, links
// com UTM e o que escrever na figurinha. Grava as imagens de pecas.html e copia
// os vídeos já gravados de saida/. No fim, gera um .zip da pasta.
//
//   node marketing/video-anuncio/montar-pasta.mjs
//
// Antes, grave os vídeos (render.mjs) — o que faltar vira aviso no LEIA-ME.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const DIR = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(DIR, 'saida');
const PASTA = join(SAIDA, 'Criativos Aprova Tico');
const SITE = 'https://www.aprovatico.com.br/';

const cal = JSON.parse(readFileSync(join(DIR, 'calendario.json'), 'utf8'));
const ctx = { window: {} };
vm.runInNewContext(readFileSync(join(DIR, 'questoes-desafio.js'), 'utf8'), ctx);
const Q = ctx.window.QUESTOES_DESAFIO;

const DIA_N = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 7 };
const DIA_NOME = { seg: 'segunda', ter: 'terça', qua: 'quarta', qui: 'quinta', sex: 'sexta', sab: 'sábado', dom: 'domingo' };
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const FMT = { reels: 'Reels', carrossel: 'Carrossel', estatico: 'Post', stories: 'Stories' };
const COMICO = { 'comico-caverna': 'caverna', 'comico-onibus': 'onibus', 'comico-aventura': 'anuncio', 'comico-edital': 'edital' };
const STORY = { seg: 'quiz', ter: 'resposta', qua: 'enquete', qui: 'caixinha', sex: 'quiz', sab: 'bastidores', dom: 'respostas' };
const limpa = (s) => s.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70);
const dataBR = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MES[m - 1]}`; };
const utm = (p, canal) => SITE + '?' + new URLSearchParams({ utm_source: canal, utm_medium: p.utm_medium, utm_campaign: p.utm_campaign, utm_content: p.utm_content });

rmSync(PASTA, { recursive: true, force: true });
mkdirSync(PASTA, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(join(DIR, 'pecas.html')).href);
const pecasDisponiveis = await page.evaluate(() => Object.keys(window.PECAS).map((k) => [k, window.PECAS[k].slides.length]));
const nSlides = Object.fromEntries(pecasDisponiveis);

async function grava(k, destinoBase) {
  const total = nSlides[k];
  const arquivos = [];
  for (let n = 0; n < total; n++) {
    const info = await page.evaluate(([kk, nn]) => window.show(kk, nn), [k, n]);
    await page.setViewportSize({ width: info.w, height: info.h });
    const nome = total > 1 ? `${destinoBase} ${String(n + 1).padStart(2, '0')}.png` : `${destinoBase}.png`;
    await page.screenshot({ path: nome, omitBackground: info.transparent, clip: { x: 0, y: 0, width: info.w, height: info.h } });
    arquivos.push(nome);
  }
  return arquivos;
}

const faltando = [];
const semanas = [...new Set(cal.map((p) => p.semana))].sort();
for (const s of semanas) {
  const doS = cal.filter((p) => p.semana === s).sort((a, b) => a.data.localeCompare(b.data) || (a.formato === 'stories') - (b.formato === 'stories'));
  const ini = doS[0].data, fim = doS[doS.length - 1].data;
  const pastaS = join(PASTA, `Semana ${s} (${dataBR(ini)} a ${dataBR(fim)})`);
  mkdirSync(pastaS, { recursive: true });
  for (const p of doS) {
    const prefixo = `${DIA_N[p.dia]}-${p.dia} ${FMT[p.formato]}`;
    const base = join(pastaS, `${prefixo} - ${limpa(p.titulo.replace('Desafio do Tico: ', 'Desafio - '))}`);
    let arquivo = '';
    if (p.formato === 'reels') {
      const video = p.pilar === 'desafio' ? `aprova-tico-desafio-${p.questao}-9x16.mp4` : COMICO[p.utm_content] ? `aprova-tico-${COMICO[p.utm_content]}-9x16.mp4` : '';
      if (video && existsSync(join(SAIDA, video))) { copyFileSync(join(SAIDA, video), base + '.mp4'); arquivo = 'vídeo .mp4 ao lado'; }
      else if (video) { faltando.push(`${prefixo}: ${video}`); arquivo = `FALTA GRAVAR: ${video}`; }
      else arquivo = 'gravar no celular (roteiro abaixo)';
    } else {
      const k = p.formato === 'stories' ? `st${p.semana}-${p.dia}-${STORY[p.dia]}` : p.utm_content;
      if (nSlides[k]) { const fs = await grava(k, base); arquivo = fs.length > 1 ? `${fs.length} imagens .png (postar na ordem)` : 'imagem .png ao lado'; }
      else { faltando.push(`${prefixo}: peça ${k}`); arquivo = `FALTA: ${k}`; }
    }
    // texto da peça
    const linhas = [
      `${p.titulo}`, `${'='.repeat(Math.min(60, p.titulo.length))}`, '',
      `Quando: ${DIA_NOME[p.dia]}, ${dataBR(p.data)} · semana ${p.semana}`,
      `Formato: ${FMT[p.formato]} · onde: ${p.canais.join(', ')}`,
      `Arquivo: ${arquivo}`, '',
      `GANCHO`, p.gancho, '', `ROTEIRO / COMO FAZER`, p.roteiro, '',
    ];
    if (p.formato === 'stories' && (p.dia === 'seg' || p.dia === 'sex') && Q[p.questao]) {
      const q = Q[p.questao];
      linhas.push('FIGURINHA DE QUIZ (escreva assim)', `Pergunta: ${q.enunciado}`, ...q.alternativas.map((a, i) => `${'ABCD'[i]}) ${a}${i === q.correta ? '   <- marque como certa' : ''}`), '');
    }
    if (p.formato === 'stories' && p.dia === 'qua') linhas.push('FIGURINHA DE ENQUETE', `Pergunta: ${p.gancho}`, 'Opções: as do texto entre parênteses (ou Sim / Não)', '');
    if (p.formato === 'stories' && p.dia === 'qui') linhas.push('FIGURINHA DE PERGUNTAS (caixinha)', `Texto: ${p.gancho}`, '');
    if (p.formato === 'stories' && p.dia === 'sab') linhas.push('A imagem é uma moldura com fundo transparente: ponha sua foto ou vídeo e cole a moldura por cima.', '');
    if (p.legenda) linhas.push('LEGENDA (copie e cole)', p.legenda, '');
    linhas.push('LINKS COM UTM (bio, figurinha de link ou anúncio)', ...p.canais.map((c) => `${c}: ${utm(p, c)}`));
    if (p.questao && Q[p.questao]) linhas.push('', `Questão da trilha: ${p.questao} (autoral). Resposta: ${'ABCD'[Q[p.questao].correta]}) ${Q[p.questao].resposta}`);
    writeFileSync(base + '.txt', linhas.join('\n') + '\n');
  }
}

// anúncios: os formatos de feed dos vídeos prontos
const pastaAd = join(PASTA, 'Anúncios (feed 4x5 e 1x1)');
mkdirSync(pastaAd, { recursive: true });
for (const nome of ['desafio-pt-acent-4', 'desafio-rlm-porc-2', 'desafio-adm-ato-3', 'caverna', 'onibus', 'anuncio']) {
  for (const f of ['4x5', '1x1']) {
    const src = join(SAIDA, `aprova-tico-${nome}-${f}.mp4`);
    if (existsSync(src)) copyFileSync(src, join(pastaAd, `aprova-tico-${nome}-${f}.mp4`));
  }
}

const leia = [
  'CRIATIVOS APROVA TICO · 12 de outubro a 8 de novembro de 2026', '',
  'Uma pasta por semana. Dentro, cada peça começa pelo número do dia (1-seg ... 7-dom).',
  'Ao lado de cada vídeo ou imagem há um .txt com: gancho, roteiro, legenda pronta, o texto da',
  'figurinha (quiz, enquete, caixinha) e os links com UTM de cada rede.', '',
  'Como postar:',
  '- Reels: use o .mp4 (9:16). O mesmo vídeo vai para o TikTok e para o Facebook.',
  '- Carrossel: poste as imagens na ordem (01, 02, 03...).',
  '- Stories: a parte do meio da imagem fica livre para a figurinha. Escreva nela o que está no .txt.',
  '- Bastidores (sábado): a imagem é uma moldura transparente para pôr por cima da sua foto.',
  '- Reels de sábado: gravar com você na câmera do celular. O roteiro está no .txt.', '',
  'Links: na bio, troque o link a cada post importante ou use a figurinha de link nos Stories.',
  'O utm_content de cada link diz qual peça trouxe o cadastro.', '',
  'Anúncios: a pasta "Anúncios" tem os vídeos prontos em 4:5 e 1:1 para o feed.',
  'Antes de impulsionar: religar o aviso de cookies (LGPD) e testar os eventos do Pixel.', '',
  'Acompanhe o andamento e os resultados no calendário: https://claude.ai/artifact/EArNMoTDAhYfFuaS9fw7Xu', '',
  ...(faltando.length ? ['AINDA FALTA:', ...faltando.map((f) => '- ' + f)] : ['Tudo pronto: nenhuma peça faltando.']),
];
writeFileSync(join(PASTA, 'LEIA-ME.txt'), leia.join('\n') + '\n');
await browser.close();

const zip = join(SAIDA, 'Criativos Aprova Tico.zip');
rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-q', zip, 'Criativos Aprova Tico'], { cwd: SAIDA });
console.log(`pasta: saida/Criativos Aprova Tico · zip: saida/Criativos Aprova Tico.zip${faltando.length ? ` · faltando: ${faltando.length}` : ''}`);
