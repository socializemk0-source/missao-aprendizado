// Integração com Postgres de verdade (roda só com PG_TEST=1 e as variáveis
// SQL_* apontando para um banco com as migrações aplicadas).
import { describe, expect, it } from 'vitest';
import { postgresProfiles } from '../../server/profiles.js';

describe.runIf(process.env.PG_TEST === '1')('postgresProfiles (Postgres real)', () => {
  const id = `pg-${Date.now()}`;

  it('ensure cria uma vez só, mesmo com chamadas simultâneas', async () => {
    const identity = { id, email: 'pg@teste.dev', name: 'Aluno PG' };
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => postgresProfiles.ensure(identity)));
    expect(new Set(results.map((p) => p.displayName))).toEqual(new Set(['Aluno PG']));
  });

  it('update grava e devolve; usuário inexistente → null', async () => {
    const updated = await postgresProfiles.update(id, { city: 'Recife', preferredBanca: 'FGV' });
    expect(updated).toMatchObject({ city: 'Recife', preferredBanca: 'FGV', displayName: 'Aluno PG' });
    expect(await postgresProfiles.update('nao-existe', { city: 'X' })).toBeNull();
  });

  it('o banco recusa nome vazio mesmo se a API falhar em validar', async () => {
    await expect(postgresProfiles.update(id, { displayName: '' })).rejects.toThrow();
  });
});
