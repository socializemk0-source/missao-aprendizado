# Revisão das questões por professor

Regra do projeto: questão só chega ao aluno depois que um professor da
matéria aprova. O professor faz isso no próprio app, em
**www.aprovatico.com.br/professor**: vê uma questão por vez, com o gabarito e
a explicação, e escolhe:

- **Aprovar** — a questão do banco passa a aparecer para os alunos (em até 5
  minutos). Na trilha (questões que já estão no app), fica registrado que
  aquela versão foi aprovada.
- **Pedir correção** — escreve o que mudar. A questão continua fora do aluno e
  vai para a aba "Correção pedida".
- **Descartar** (só do banco) — com o motivo. A questão é anulada.

Cada decisão fica gravada em `v2.question_reviews` com o professor, a data e a
versão do texto que ele viu. Se o texto mudar depois (uma correção), a questão
volta sozinha para a fila dele, mostrando o pedido anterior.

## Cadastrar um professor (dono)

1. Rode a migração `supabase/migrations/0014_v2_revisao_professor.sql` no SQL
   Editor do Supabase (uma vez só).
2. O professor cria uma conta normal no app, com o e-mail dele, e confirma o
   e-mail.
3. No SQL Editor, cadastre pegando o e-mail **do próprio login** (assim não
   entra espaço nem caractere invisível de um e-mail copiado e colado):

```sql
insert into v2.revisores (email, nome, disciplinas)
select email, 'Profa. Maria', '{portugues}'
from auth.users
where email = 'professora@exemplo.com';
```

   Tem que aparecer `INSERT 0 1`. Se aparecer `INSERT 0 0`, o professor
   ainda não criou a conta ou o e-mail está diferente do login.

Matérias: `portugues`, `rlm`, `informatica`, `constitucional`,
`administrativo` (várias: `'{constitucional,administrativo}'`). Para todas
as matérias, use `null`.

4. Mande o link `www.aprovatico.com.br/professor` para o professor.

Para tirar o acesso: `delete from v2.revisores where email = 'professora@exemplo.com';`

Se o professor abrir `/professor` e vir "Esta área é só para os professores",
confira se o e-mail cadastrado é igual ao do login:

```sql
select u.email as email_do_login, r.email as email_na_tabela
from auth.users u left join v2.revisores r on lower(r.email) = lower(u.email)
where u.email = 'professora@exemplo.com';
```

Se `email_na_tabela` vier vazio, apague a linha errada em `v2.revisores` e
cadastre de novo pelo modelo acima.

## Acompanhar

```sql
-- Quantas questões do banco por matéria e situação
select disciplina, status, count(*) from v2.questions group by 1, 2 order by 1, 2;

-- Pedidos de correção em aberto (o último pedido de cada questão)
select * from (
  select distinct on (question_id) question_id, acao, nota, revisor_email, created_at
  from v2.question_reviews order by question_id, created_at desc, id desc
) u where acao = 'corrigir' order by created_at;
```

## Aplicar uma correção

Mande a lista de pedidos para o Claude (ou corrija você) nos arquivos
`content/banco/*.json` (questões do banco) ou `content/questoes/*.ts`
(trilha). Depois:

- Banco: `node scripts/banco-sql.mjs` regenera
  `0013_v2_banco_sincroniza.sql`; rode esse arquivo no SQL Editor. Só as
  questões que ainda estão em revisão mudam.
- Trilha: o texto novo entra no ar com o deploy.

Com o texto novo, a questão volta para a fila do professor.
