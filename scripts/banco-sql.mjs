// Gera a migração que coloca content/banco/autorais.json em v2.questions.
// Uso: node scripts/banco-sql.mjs  (reescreve o arquivo da migração)
// ON CONFLICT DO NOTHING: rodar de novo não desfaz a revisão feita no banco
// (status 'ativa' depois que um professor aprova, textos corrigidos etc.).
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'supabase/migrations/0007_v2_questoes_autorais.sql';
const bank = JSON.parse(readFileSync('content/banco/autorais.json', 'utf8'));
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

const rows = bank.map((q) => `  (${[
  lit(q.id), lit(q.disciplina), lit(q.assunto), lit(q.enunciado),
  `${lit(JSON.stringify(q.alternativas))}::jsonb`, q.correta, lit(q.explicacao),
  `${lit(JSON.stringify(q.fonte))}::jsonb`, q.dificuldade, lit(q.status),
].join(', ')})`);

writeFileSync(OUT, `-- Questões autorais em revisão (content/banco/autorais.json).
-- Arquivo gerado por scripts/banco-sql.mjs. Não edite à mão.
-- Entram com status 'revisao': só aparecem para o aluno quando um professor
-- revisar e mudar para 'ativa'. Rodar de novo não sobrescreve nada.
INSERT INTO v2.questions (id, disciplina, assunto, enunciado, alternativas, correta, explicacao, fonte, dificuldade, status) VALUES
${rows.join(',\n')}
ON CONFLICT (id) DO NOTHING;
`);
console.log(`${OUT}: ${bank.length} questões`);
