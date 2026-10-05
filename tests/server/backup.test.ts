// Backup semanal do banco (scripts/backup.sh + .github/workflows/backup.yml).
// O arquivo sai criptografado com a senha do dono: nunca vai para o GitHub
// em texto aberto (ele tem os dados dos alunos e os logins).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/backup.yml', 'utf8');
const script = readFileSync('scripts/backup.sh', 'utf8');

describe('backup automático', () => {
  it('roda toda semana e também pelo botão "Run workflow"', () => {
    expect(workflow).toMatch(/schedule:\s*\n\s*- cron: '\d+ \d+ \* \* [0-6]'/);
    expect(workflow).toContain('workflow_dispatch:');
  });

  it('usa só segredos do GitHub (nada de senha no arquivo) e envia apenas o arquivo criptografado', () => {
    expect(workflow).toContain('BACKUP_DB_URL: ${{ secrets.SUPABASE_DB_URL }}');
    expect(workflow).toContain('BACKUP_PASSPHRASE: ${{ secrets.BACKUP_PASSPHRASE }}');
    expect(workflow).toMatch(/path: backups\/\*\.gpg/);
    expect(workflow).toMatch(/retention-days: \d+/);
    expect(workflow).toContain('permissions:\n  contents: read');
  });

  it('o script copia o v2 inteiro e os logins, confere o arquivo e criptografa com AES256 (senha fora da linha de comando)', () => {
    expect(script).toContain('--schema=v2');
    expect(script).toContain('--table=auth.users');
    expect(script).toContain('--table=auth.identities');
    expect(script).toContain('--cipher-algo AES256');
    expect(script).toContain('--passphrase-fd');
    expect(script).not.toMatch(/--passphrase[ =]"?\$/);
  });
});

const run = process.env.PG_TEST === '1';

describe.runIf(run)('backup no Postgres de verdade', () => {
  it('gera um .gpg que só abre com a senha e traz as tabelas do v2 e os logins', () => {
    const env = process.env;
    const host = env.SQL_HOST ?? 'localhost';
    const sock = host.startsWith('/');
    const url = `postgresql://${encodeURIComponent(env.SQL_USER ?? 'postgres')}:${encodeURIComponent(env.SQL_PASSWORD ?? '')}@${sock ? '' : host}:${env.SQL_PORT ?? '5432'}/${env.SQL_DB_NAME ?? 'postgres'}${sock ? `?host=${encodeURIComponent(host)}` : ''}`;
    // No Supabase, auth.users e auth.identities já existem; aqui criamos iguais (só o necessário).
    execFileSync('psql', [url, '-q', '-v', 'ON_ERROR_STOP=1', '-c',
      'create schema if not exists auth; create table if not exists auth.users (id uuid primary key, email text); create table if not exists auth.identities (id uuid primary key, user_id uuid);']);

    const dir = mkdtempSync(join(tmpdir(), 'backup-'));
    try {
      const out = execFileSync('bash', ['scripts/backup.sh'], {
        env: { ...env, BACKUP_DB_URL: url, BACKUP_PASSPHRASE: 'senha de teste', BACKUP_DIR: dir }, encoding: 'utf8',
      });
      const files = readdirSync(dir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^aprova-tico-\d{4}-\d{2}-\d{2}\.tar\.gz\.gpg$/);
      expect(out).toContain(files[0]);
      const gpg = join(dir, files[0]!);

      // Sem a senha certa, não abre.
      let abriu = true;
      try {
        execFileSync('bash', ['-c', `gpg --batch --pinentry-mode loopback --passphrase errada -d "${gpg}" > /dev/null 2>&1`]);
      } catch {
        abriu = false;
      }
      expect(abriu).toBe(false);

      execFileSync('bash', ['-c', `gpg --batch --pinentry-mode loopback --passphrase 'senha de teste' -d "${gpg}" 2>/dev/null | tar -xz -C "${dir}"`]);
      expect(existsSync(join(dir, 'v2.dump'))).toBe(true);
      const v2 = execFileSync('pg_restore', ['-l', join(dir, 'v2.dump')], { encoding: 'utf8' });
      for (const t of ['profiles', 'questions', 'payments', 'question_reviews']) expect(v2).toMatch(new RegExp(`TABLE DATA v2 ${t} `));
      const auth = execFileSync('pg_restore', ['-l', join(dir, 'auth.dump')], { encoding: 'utf8' });
      expect(auth).toMatch(/TABLE DATA auth users /);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
