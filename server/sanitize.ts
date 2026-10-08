// Texto que veio de fora e fica guardado para aparecer depois num CRM, num
// e-mail ou num painel: duas defesas.
//
// 1. Ao GRAVAR (textoLimpo): tira caracteres de controle e de direção do
//    texto (usados para disfarçar conteúdo), sinais de HTML (< > " ' ` &) e o
//    começo que planilhas leem como fórmula (= + - @ e tab), para o texto já
//    entrar inofensivo no banco e em qualquer exportação (CSV).
// 2. Ao MOSTRAR (escapeHtml): qualquer tela, e-mail ou painel futuro que
//    montar HTML com esses dados passa cada valor por escapeHtml — nunca
//    concatena texto cru (stored XSS).

const CONTROLE = /[\p{Cc}\p{Cf}\u2028\u2029]/gu; // inclui as marcas de direção (U+202A–202E, U+2066–2069)
const HTML = /[<>"'`&]/g;
const FORMULA_NO_COMECO = /^[\s=+\-@]+/u;

export function textoLimpo(texto: string, max: number): string {
  return texto
    .normalize('NFKC')
    .replace(CONTROLE, '')
    .replace(HTML, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(FORMULA_NO_COMECO, '')
    .slice(0, max)
    .trim();
}

const ENTIDADES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

export function escapeHtml(texto: string): string {
  return texto.replace(/[&<>"'`]/g, (c) => ENTIDADES[c]!);
}
