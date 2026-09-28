import type { ApiRequest, ApiResponse } from '../../server/http.js';
import type { Identity, VerifyToken } from '../../server/auth.js';
import { defaultDisplayName, type Profile, type ProfileStore } from '../../server/profiles.js';
import { toPublicQuestion, type QuestionStore } from '../../server/question-store.js';
import type { Question } from '../../server/questions.js';

export interface CapturedResponse extends ApiResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
}

export function makeRes(): CapturedResponse {
  const res: CapturedResponse = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
    },
    setHeader(name, value) {
      res.headers[name] = value;
    },
  };
  return res;
}

export function makeReq(partial: Partial<ApiRequest> & { token?: string } = {}): ApiRequest {
  const { token, ...rest } = partial;
  return {
    method: 'GET',
    query: {},
    ...rest,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(rest.headers ?? {}) },
  };
}

// Tokens de teste: "ok:<id>" é válido para o usuário <id>; o resto é inválido.
export const fakeVerify: VerifyToken = async (token) => {
  const match = /^ok:(.+)$/.exec(token);
  if (!match?.[1]) return null;
  const id = match[1];
  return { id, email: `${id}@teste.dev`, name: id === 'sem-nome' ? null : `Aluno ${id}` } satisfies Identity;
};

export function memoryProfiles(): ProfileStore & { rows: Map<string, Profile> } {
  const rows = new Map<string, Profile>();
  return {
    rows,
    async ensure(identity) {
      if (!rows.has(identity.id)) {
        rows.set(identity.id, { displayName: defaultDisplayName(identity), targetExam: null, preferredBanca: null, city: null });
      }
      return { ...rows.get(identity.id)! };
    },
    async update(userId, fields) {
      const current = rows.get(userId);
      if (!current) return null;
      const next = { ...current, ...fields };
      rows.set(userId, next);
      return { ...next };
    },
  };
}

// Banco de questões em memória, com as mesmas regras do Postgres: só o que
// está publicado aparece ou pode ser respondido.
export function memoryQuestions(all: Question[]): QuestionStore {
  const published = () => all.filter((q) => q.status === 'publicada');
  return {
    async listPublished({ subject, limit }) {
      return published()
        .filter((q) => !subject || q.subject === subject)
        .slice(0, limit)
        .map(toPublicQuestion);
    },
    async answerKey(id) {
      const q = published().find((item) => item.id === id);
      return q ? { correctIndex: q.correctIndex, optionsCount: q.options.length, explanation: q.explanation, legalBasis: q.legalBasis ?? null } : null;
    },
  };
}
