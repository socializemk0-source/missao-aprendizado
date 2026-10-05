# Backup do banco

O plano grátis do Supabase não faz backup. Por isso o GitHub faz um **toda
segunda-feira às 03:17** (horário de Brasília) e guarda por **90 dias**
(`.github/workflows/backup.yml`, que roda `scripts/backup.sh`).

O que vai no backup: todo o schema `v2` (estrutura e dados: perfis,
progresso, questões, pagamentos, revisões) e os logins (`auth.users` e
`auth.identities`). Sai um arquivo só, `aprova-tico-AAAA-MM-DD.tar.gz.gpg`,
criptografado com AES256. **Sem a senha, ninguém abre — nem você.**

## Configurar (uma vez)

1. **Endereço do banco.** No Supabase: *Connect* (botão no topo do projeto) →
   *Session pooler* → copie a URI (`postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-...pooler.supabase.com:5432/postgres`)
   e troque `[YOUR-PASSWORD]` pela senha do banco. Use o *Session pooler*: o
   *Direct connection* não funciona a partir do GitHub.
2. **Senha do backup.** Crie uma senha longa (ex.: 5 palavras aleatórias) e
   guarde no seu gerenciador de senhas. Se perder, os backups ficam inúteis.
3. **Segredos no GitHub.** No repositório: *Settings → Secrets and variables →
   Actions → New repository secret*. Crie dois:
   - `SUPABASE_DB_URL` = a URI do passo 1
   - `BACKUP_PASSPHRASE` = a senha do passo 2
4. **Teste agora.** *Actions → Backup do banco → Run workflow*. Em uns 2
   minutos fica verde. Abra a execução: no fim da página, em *Artifacts*, está
   o `backup-N` para baixar.

## Toda semana (2 minutos)

- Em *Actions → Backup do banco*, confira que a última execução está verde
  (se falhar, o GitHub manda e-mail).
- Uma vez por mês, baixe o último backup e guarde fora do GitHub (Google
  Drive, HD externo). Ele já está criptografado.

Atenção: num repositório **público**, o GitHub desliga os agendamentos depois
de 60 dias sem nenhum commit (e avisa por e-mail; é só reativar em *Actions*).
Repositório privado é o recomendado (ver `docs/seguranca.md`).

## Abrir e restaurar

Precisa de `gpg` e do cliente do Postgres 17 (`pg_restore`) no computador. Em
caso de dúvida, peça ajuda antes: restaurar por cima **apaga o que está no
banco agora**.

```bash
# 1. Abrir (pede a senha do backup)
gpg -d aprova-tico-AAAA-MM-DD.tar.gz.gpg | tar -xz     # sai v2.dump e auth.dump

# 2. Conferir o conteúdo, sem mexer em nada
pg_restore -l v2.dump | less

# 3a. Voltar o v2 no mesmo projeto (substitui as tabelas do v2 pelas do backup)
pg_restore --clean --if-exists --no-owner -d "$SUPABASE_DB_URL" v2.dump

# 3b. Só num projeto Supabase NOVO (os logins não existem lá): primeiro os logins, depois o v2
pg_restore --data-only --no-owner -d "$NOVO_DB_URL" auth.dump
pg_restore --no-owner -d "$NOVO_DB_URL" v2.dump
```

Rodar na mão, sem o GitHub (precisa de `pg_dump` 17 e `gpg`):

```bash
BACKUP_DB_URL='postgresql://...' BACKUP_PASSPHRASE='...' bash scripts/backup.sh
# o arquivo sai em backups/ (pasta ignorada pelo git)
```

## Exclusão de conta e backups

Quem exclui a conta some do banco na hora e dos backups em até 90 dias (quando
o último backup com os dados dela vence). Isso está na Política de privacidade.
Se restaurar um backup antigo, apague de novo as contas excluídas depois da
data dele.
