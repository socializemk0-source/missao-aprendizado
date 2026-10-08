#!/usr/bin/env bash
# Backup do banco do Aprova Tico: o schema v2 inteiro (estrutura e dados) e os
# logins do Supabase (auth.users e auth.identities). Sai um único arquivo
# criptografado (AES256) com a senha do dono — sem ela, ninguém abre.
#
# Roda sozinho toda semana pelo GitHub Actions (.github/workflows/backup.yml).
# Também dá para rodar na mão (precisa de pg_dump na versão do servidor, ou
# mais nova, e gpg):
#   BACKUP_DB_URL='postgresql://...' BACKUP_PASSPHRASE='...' bash scripts/backup.sh
# Como abrir e restaurar: docs/backup.md.
set -euo pipefail

: "${BACKUP_DB_URL:?Defina BACKUP_DB_URL (Supabase → Connect → Session pooler)}"
: "${BACKUP_PASSPHRASE:?Defina BACKUP_PASSPHRASE (a senha que abre o backup)}"
OUT_DIR="${BACKUP_DIR:-backups}"
BIN="${PG_BIN:+$PG_BIN/}"
STAMP="$(date -u +%Y-%m-%d)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

"${BIN}pg_dump" "$BACKUP_DB_URL" --schema=v2 --no-owner --no-privileges -Fc -f "$TMP/v2.dump"
"${BIN}pg_dump" "$BACKUP_DB_URL" --data-only --table=auth.users --table=auth.identities --no-owner --no-privileges -Fc -f "$TMP/auth.dump"

# Confere que o arquivo abre e tem o principal antes de guardar. Sem "grep -q":
# ele para na primeira linha, o pg_restore leva SIGPIPE e o pipefail dá erro.
"${BIN}pg_restore" -l "$TMP/v2.dump" | grep "TABLE DATA v2 profiles " > /dev/null || { echo "Backup incompleto: falta v2.profiles" >&2; exit 1; }
"${BIN}pg_restore" -l "$TMP/auth.dump" | grep "TABLE DATA auth users " > /dev/null || { echo "Backup incompleto: faltam os logins" >&2; exit 1; }

mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/aprova-tico-$STAMP.tar.gz.gpg"
# A senha entra pelo descritor 3, não pela linha de comando (não aparece na lista de processos).
tar -C "$TMP" -czf - v2.dump auth.dump \
  | gpg --batch --yes --pinentry-mode loopback --symmetric --cipher-algo AES256 --passphrase-fd 3 -o "$OUT" 3<<<"$BACKUP_PASSPHRASE"
echo "Backup pronto: $OUT"
