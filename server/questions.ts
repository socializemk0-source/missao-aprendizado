// Banco de questões: formato, validação e gravação.
// As questões ficam em content/questoes/*.json (revisáveis no Git) e vão
// para v2.questions com `node scripts/seed-questions.mjs`.
// Este arquivo não importa nada do projeto para rodar direto no Node
// (o script de carga o importa sem passar pelo build).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SUBJECTS = {
  portugues: 'Português',
  raciocinio_logico: 'Raciocínio Lógico',
  informatica: 'Informática',
  direito_constitucional: 'Direito Constitucional',
  direito_administrativo: 'Direito Administrativo',
} as const;

export type Subject = keyof typeof SUBJECTS;

export interface Question {
  id: string;
  subject: Subject;
  topic: string;
  level: 'fundamental' | 'medio' | 'superior';
  difficulty: 1 | 2 | 3;
  statement: string;
  options: string[];
  correctIndex: number;
  explanation: string; // sempre nossa, nunca copiada
  legalBasis?: string;
  style?: string; // "no estilo" de qual banca — só para questão própria
  origin: 'propria' | 'oficial';
  // Só para 'oficial': origem completa e autorização por escrito da banca.
  banca?: string;
  examYear?: number;
  orgao?: string;
  cargo?: string;
  sourceUrl?: string;
  authorizationNote?: string;
  status: 'rascunho' | 'publicada';
}

const LEVELS = ['fundamental', 'medio', 'superior'];
const STATUSES = ['rascunho', 'publicada'];
const OFFICIAL_FIELDS = ['banca', 'examYear', 'orgao', 'cargo', 'sourceUrl', 'authorizationNote'] as const;

function text(v: unknown, min: number, max: number) {
  return typeof v === 'string' && v.trim().length >= min && v.length <= max;
}

function present(v: unknown) {
  return v !== undefined && v !== null && v !== '';
}

// Mesmas regras da migração 0003 (o banco também recusa), com mensagens
// que dizem o que corrigir no arquivo de conteúdo.
export function validateQuestion(input: unknown): string[] {
  if (!input || typeof input !== 'object') return ['questão vazia'];
  const q = input as Record<string, unknown>;
  const errors: string[] = [];
  const id = typeof q.id === 'string' ? q.id : '?';
  const err = (msg: string) => errors.push(`${id}: ${msg}`);

  if (typeof q.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.id) || q.id.length > 60) err('id inválido (use minúsculas, números e hífen)');
  if (typeof q.subject !== 'string' || !(q.subject in SUBJECTS)) err(`matéria desconhecida: ${String(q.subject)}`);
  if (!text(q.topic, 1, 80)) err('assunto (topic) vazio ou longo demais');
  if (!LEVELS.includes(q.level as string)) err('nível inválido');
  if (![1, 2, 3].includes(q.difficulty as number)) err('dificuldade deve ser 1, 2 ou 3');
  if (!text(q.statement, 10, 4000)) err('enunciado vazio ou longo demais');
  if (!text(q.explanation, 10, 4000)) err('explicação vazia ou longa demais');
  if (!STATUSES.includes(q.status as string)) err('status inválido');
  if (present(q.legalBasis) && !text(q.legalBasis, 1, 200)) err('base legal inválida');

  const options = q.options;
  if (!Array.isArray(options) || options.length < 2 || options.length > 5 || !options.every((o) => text(o, 1, 1000))) {
    err('precisa de 2 a 5 alternativas com texto');
  } else {
    if (new Set(options.map((o: string) => o.trim().toLowerCase())).size !== options.length) err('alternativas repetidas');
    if (options.length === 2 && !(options[0] === 'Certo' && options[1] === 'Errado')) err('com duas alternativas, use exatamente ["Certo", "Errado"]');
    if (options.length === 3) err('use 4 ou 5 alternativas (ou Certo/Errado)');
    if (!Number.isInteger(q.correctIndex) || (q.correctIndex as number) < 0 || (q.correctIndex as number) >= options.length) err('gabarito fora das alternativas');
  }

  if (q.origin === 'propria') {
    const fake = OFFICIAL_FIELDS.filter((f) => present(q[f]));
    if (fake.length) err(`questão própria não pode ter dados de prova oficial (${fake.join(', ')})`);
    if (present(q.style) && !text(q.style, 1, 40)) err('estilo inválido');
  } else if (q.origin === 'oficial') {
    if (!text(q.authorizationNote, 10, 500)) err('questão oficial exige a autorização por escrito da banca (authorizationNote)');
    if (!text(q.banca, 1, 40)) err('questão oficial sem banca');
    if (!Number.isInteger(q.examYear) || (q.examYear as number) < 1988 || (q.examYear as number) > 2100) err('questão oficial sem ano válido');
    if (!text(q.orgao, 1, 120)) err('questão oficial sem órgão');
    if (!text(q.cargo, 1, 120)) err('questão oficial sem cargo');
    if (typeof q.sourceUrl !== 'string' || !q.sourceUrl.startsWith('https://')) err('questão oficial sem link https da prova');
    if (present(q.style)) err('questão oficial não usa "style"');
  } else {
    err('origem deve ser "propria" ou "oficial"');
  }
  return errors;
}

export function validateBank(questions: unknown[]): string[] {
  const errors = questions.flatMap(validateQuestion);
  const seen = new Set<string>();
  for (const q of questions) {
    const id = (q as { id?: unknown } | null)?.id;
    if (typeof id !== 'string') continue;
    if (seen.has(id)) errors.push(`${id}: id repetido`);
    seen.add(id);
  }
  return errors;
}

export function loadBank(dir = join(process.cwd(), 'content', 'questoes')): Question[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Question[]);
}

const COLUMNS = [
  'id', 'subject', 'topic', 'level', 'difficulty', 'statement', 'options', 'correct_index',
  'explanation', 'legal_basis', 'style', 'origin', 'banca', 'exam_year', 'orgao', 'cargo',
  'source_url', 'authorization_note', 'status',
];

// Insere ou atualiza pelo id. Parametrizado: o texto nunca entra no SQL.
export function upsertStatement(q: Question): { text: string; values: unknown[] } {
  const values = [
    q.id, q.subject, q.topic, q.level, q.difficulty, q.statement, JSON.stringify(q.options), q.correctIndex,
    q.explanation, q.legalBasis ?? null, q.style ?? null, q.origin, q.banca ?? null, q.examYear ?? null,
    q.orgao ?? null, q.cargo ?? null, q.sourceUrl ?? null, q.authorizationNote ?? null, q.status,
  ];
  const placeholders = COLUMNS.map((c, i) => (c === 'options' ? `$${i + 1}::jsonb` : `$${i + 1}`));
  const updates = COLUMNS.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`);
  return {
    text:
      `INSERT INTO v2.questions (${COLUMNS.join(', ')}) VALUES (${placeholders.join(', ')}) ` +
      `ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}, updated_at = now()`,
    values,
  };
}
