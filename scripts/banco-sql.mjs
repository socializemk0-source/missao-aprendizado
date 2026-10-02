// Gera as migrações que colocam as questões de content/banco/ em v2.questions.
// A lista de lotes (arquivos JSON → migração) fica em content/banco/lotes.json.
// Uso: node scripts/banco-sql.mjs  (reescreve todas as migrações dos lotes)
// ON CONFLICT DO NOTHING: rodar de novo não desfaz a revisão feita no banco
// (status 'ativa' depois que um professor aprova, textos corrigidos etc.).
import { readFileSync, writeFileSync } from 'node:fs';

const lotes = JSON.parse(readFileSync('content/banco/lotes.json', 'utf8'));
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const linhas = (bank) => bank.map((q) => `  (${[
  lit(q.id), lit(q.disciplina), lit(q.assunto), lit(q.enunciado),
  `${lit(JSON.stringify(q.alternativas))}::jsonb`, q.correta, lit(q.explicacao),
  `${lit(JSON.stringify(q.fonte))}::jsonb`, q.dificuldade, lit(q.status),
].join(', ')})`);

for (const lote of lotes) {
  const bank = lote.arquivos.flatMap((f) => JSON.parse(readFileSync(`content/banco/${f}`, 'utf8')));
  const rows = linhas(bank);
  const out = `supabase/migrations/${lote.migracao}`;
  writeFileSync(out, `-- Questões autorais em revisão (content/banco/${lote.arquivos.join(', ')}).
-- Arquivo gerado por scripts/banco-sql.mjs. Não edite à mão.
-- Entram com status 'revisao': só aparecem para o aluno quando um professor
-- revisar e mudar para 'ativa'. Rodar de novo não sobrescreve nada.
INSERT INTO v2.questions (id, disciplina, assunto, enunciado, alternativas, correta, explicacao, fonte, dificuldade, status) VALUES
${rows.join(',\n')}
ON CONFLICT (id) DO NOTHING;
`);
  console.log(`${out}: ${bank.length} questões`);
}

// Sincronização: o texto atual de TODAS as questões dos lotes. Corrige no
// banco as que ainda estão em revisão; as já aprovadas por um professor
// ('ativa') ou anuladas não são tocadas. Rode de novo a cada correção.
const SYNC = 'supabase/migrations/0013_v2_banco_sincroniza.sql';
const todas = lotes.flatMap((l) => l.arquivos).flatMap((f) => JSON.parse(readFileSync(`content/banco/${f}`, 'utf8')));
writeFileSync(SYNC, `-- Sincroniza o texto das questões do banco com content/banco/*.json.
-- Arquivo gerado por scripts/banco-sql.mjs. Não edite à mão.
-- Atualiza só as questões que ainda estão em 'revisao' (as aprovadas por um
-- professor ficam como estão). Pode rodar de novo sem estragar nada.
INSERT INTO v2.questions (id, disciplina, assunto, enunciado, alternativas, correta, explicacao, fonte, dificuldade, status) VALUES
${linhas(todas).join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  disciplina = EXCLUDED.disciplina, assunto = EXCLUDED.assunto, enunciado = EXCLUDED.enunciado,
  alternativas = EXCLUDED.alternativas, correta = EXCLUDED.correta, explicacao = EXCLUDED.explicacao,
  fonte = EXCLUDED.fonte, dificuldade = EXCLUDED.dificuldade, updated_at = now()
WHERE v2.questions.status = 'revisao';
`);
console.log(`${SYNC}: ${todas.length} questões (sincronização)`);
