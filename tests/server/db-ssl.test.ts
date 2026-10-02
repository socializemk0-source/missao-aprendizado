// Conexão com o banco: com o certificado do Supabase configurado, o
// servidor confere quem está do outro lado (evita banco falso no meio).
import { describe, expect, it } from 'vitest';
import { sslConfig } from '../../server/db.js';

const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';

describe('SSL do banco', () => {
  it('com SQL_CA_CERT confere o certificado (aceita o PEM colado com \\n literal)', () => {
    expect(sslConfig({ SQL_CA_CERT: PEM })).toEqual({ rejectUnauthorized: true, ca: PEM });
    expect(sslConfig({ SQL_CA_CERT: PEM.replace(/\n/g, '\\n') })).toEqual({ rejectUnauthorized: true, ca: PEM });
  });

  it('sem certificado continua criptografado (como antes); SQL_SSL=false só no Postgres local', () => {
    expect(sslConfig({})).toEqual({ rejectUnauthorized: false });
    expect(sslConfig({ SQL_SSL: 'false', SQL_CA_CERT: PEM })).toBe(false);
  });
});
