// Confere o DNS de e-mail do aprovatico.com.br: DMARC, SPF e DKIM.
// Uso: node scripts/email-dns.mjs   (sai com erro se algo estiver errado)
// Roda toda segunda no GitHub Actions (.github/workflows/email-dns.yml).
// O que cada registro deve ter, e o cronograma do DMARC: docs/email.md.

import { resolveCname, resolveMx, resolveNs, resolveTxt } from 'node:dns/promises';

export const DOMINIO = 'aprovatico.com.br';
export const RUA = 'mailto:report@aprovatico.com.br';
// Seletores DKIM de quem envia em nome do domínio.
export const DKIM = [
  { quem: 'Resend (e-mails do cadastro e da senha)', nome: `resend._domainkey.${DOMINIO}`, obrigatorio: true },
  { quem: 'ImprovMX (só se as respostas do contato@ saem pelo SMTP do ImprovMX)', nome: `dkimprovmx1._domainkey.${DOMINIO}`, obrigatorio: false },
];

const juntar = (registros) => registros.map((partes) => partes.join(''));

// ---------------------------------------------------------------- regras (puras, testadas)
export function lerDmarc(txts) {
  const dmarc = txts.filter((t) => /^v=DMARC1\b/i.test(t.trim()));
  if (dmarc.length !== 1) return { erro: dmarc.length ? 'mais de um registro DMARC (os provedores ignoram todos)' : 'sem registro DMARC' };
  const tags = Object.fromEntries(dmarc[0].split(';').map((p) => p.trim()).filter(Boolean).map((p) => {
    const i = p.indexOf('=');
    return [p.slice(0, i).trim().toLowerCase(), p.slice(i + 1).trim()];
  }));
  return { tags };
}

export function avaliarDmarc(txts) {
  const erros = [];
  const avisos = [];
  const { erro, tags } = lerDmarc(txts);
  if (erro) return { erros: [erro], avisos };
  const p = (tags.p ?? '').toLowerCase();
  const pct = tags.pct === undefined ? 100 : Number(tags.pct);
  if (!['none', 'quarantine', 'reject'].includes(p)) erros.push(`DMARC com p inválido: "${tags.p}"`);
  if (p === 'none') erros.push('DMARC em p=none: só observa, não protege (etapa 1 é p=quarantine; pct=25)');
  if (!(tags.rua ?? '').split(',').map((s) => s.trim().toLowerCase()).includes(RUA)) erros.push(`DMARC sem rua=${RUA} (sem relatório não dá para avançar as etapas)`);
  if (!Number.isInteger(pct) || pct < 1 || pct > 100) erros.push(`DMARC com pct inválido: "${tags.pct}"`);
  if (p === 'quarantine' && pct < 100) avisos.push(`etapa 1: p=quarantine em ${pct}% (próxima: pct=100)`);
  if (p === 'quarantine' && pct === 100) avisos.push('etapa 2: p=quarantine em 100% (próxima: p=reject)');
  if (tags.sp && tags.sp.toLowerCase() === 'none') erros.push('DMARC com sp=none: subdomínios ficam sem proteção');
  return { erros, avisos, politica: `p=${p}${pct < 100 ? ` pct=${pct}` : ''}` };
}

export function avaliarSpf(txts, { exigir = ['spf.improvmx.com'] } = {}) {
  const erros = [];
  const avisos = [];
  const spf = txts.filter((t) => /^v=spf1\b/i.test(t.trim()));
  if (spf.length !== 1) return { erros: [spf.length ? 'mais de um registro SPF (o SPF inteiro falha: permerror)' : 'sem registro SPF'], avisos };
  const termos = spf[0].trim().split(/\s+/).slice(1);
  for (const inc of exigir) if (!termos.includes(`include:${inc}`)) erros.push(`SPF sem include:${inc}`);
  const fim = termos.find((t) => /^[~?+-]?all$/i.test(t)) ?? '';
  if (fim === '+all' || fim === 'all' || fim === '?all') erros.push(`SPF termina em ${fim || 'nada'}: qualquer servidor pode enviar como o domínio`);
  else if (!fim) erros.push('SPF sem "all" no fim');
  else if (fim === '~all') avisos.push('SPF em ~all (troque por -all depois de confirmar todas as fontes nos relatórios DMARC)');
  const consultas = termos.filter((t) => /^(include:|a\b|a:|mx\b|mx:|exists:|redirect=|ptr)/i.test(t)).length;
  if (consultas > 10) erros.push(`SPF com ${consultas} consultas de DNS (o limite é 10)`);
  return { erros, avisos, registro: spf[0] };
}

// ---------------------------------------------------------------- consulta real
async function txt(nome) {
  try { return juntar(await resolveTxt(nome)); } catch { return []; }
}

export async function conferir() {
  const linhas = [];
  let falhou = false;
  // Sem conseguir resolver o próprio domínio, nada do que vem depois vale.
  const ns = await resolveNs(DOMINIO).catch((e) => e.code ?? 'erro');
  if (!Array.isArray(ns)) return { linhas: [`não foi possível consultar o DNS de ${DOMINIO} (${ns}): sem rede/DNS aqui?`], falhou: true, semDns: true };
  const relatar = (titulo, r) => {
    for (const e of r.erros) { falhou = true; linhas.push(`ERRO   ${titulo}: ${e}`); }
    for (const a of r.avisos) linhas.push(`AVISO  ${titulo}: ${a}`);
    if (!r.erros.length) linhas.push(`ok     ${titulo}${r.politica ? ` (${r.politica})` : ''}${r.registro ? `: ${r.registro}` : ''}`);
  };
  relatar('DMARC', avaliarDmarc(await txt(`_dmarc.${DOMINIO}`)));
  relatar('SPF', avaliarSpf(await txt(DOMINIO)));
  for (const d of DKIM) {
    const existe = (await txt(d.nome)).some((t) => /p=/.test(t)) || (await resolveCname(d.nome).then((c) => c.length > 0, () => false));
    if (existe) linhas.push(`ok     DKIM ${d.quem}`);
    else if (d.obrigatorio) { falhou = true; linhas.push(`ERRO   DKIM ${d.quem}: ${d.nome} não encontrado`); }
    else linhas.push(`aviso  DKIM ${d.quem}: ${d.nome} não encontrado`);
  }
  const mx = await resolveMx(DOMINIO).catch(() => []);
  if (mx.some((m) => /improvmx/i.test(m.exchange))) linhas.push('ok     MX do ImprovMX (contato@ e report@ chegam)');
  else { falhou = true; linhas.push('ERRO   MX: o ImprovMX não está no MX (contato@ e os relatórios DMARC não chegam)'); }
  return { linhas, falhou };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { linhas, falhou, semDns } = await conferir();
  console.log(linhas.join('\n'));
  process.exit(semDns ? 2 : falhou ? 1 : 0);
}
