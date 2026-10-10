// Tipos de scripts/email-dns.mjs (para os testes).
export const DOMINIO: string;
export const RUA: string;
export interface Avaliacao { erros: string[]; avisos: string[]; politica?: string; registro?: string }
export function avaliarDmarc(txts: string[]): Avaliacao;
export function avaliarSpf(txts: string[], opcoes?: { exigir?: string[] }): Avaliacao;
export function conferir(): Promise<{ linhas: string[]; falhou: boolean; semDns?: boolean }>;
