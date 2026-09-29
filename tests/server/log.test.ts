// Logs sem dados pessoais: o erro de consulta do Drizzle traz os parâmetros
// (id e nome do aluno); o log deve mostrar só a causa.
import { describe, expect, it } from 'vitest';
import { errorText } from '../../server/log.js';

describe('errorText', () => {
  it('erro de consulta: mostra a causa do Postgres, nunca os parâmetros', () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
    const err = new Error('Failed query: insert into "v2"."profiles" ("user_id", "display_name") values ($1, $2)\nparams: 4151-aaaa,Vitor Santos', { cause });
    expect(errorText(err)).toBe('ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:5432');
    expect(errorText(err)).not.toMatch(/Vitor|4151/);
  });

  it('sem causa: corta a parte dos parâmetros', () => {
    const text = errorText(new Error('Failed query: select 1\nparams: maria@teste.dev'));
    expect(text).toBe('Failed query: select 1');
  });

  it('erro comum e valor que não é erro', () => {
    expect(errorText(new Error('HTTP 500'))).toBe('HTTP 500');
    expect(errorText('falhou')).toBe('falhou');
  });
});
