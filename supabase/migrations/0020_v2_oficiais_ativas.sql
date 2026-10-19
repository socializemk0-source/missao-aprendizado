-- Questões de provas oficiais liberadas para o aluno sem esperar o professor
-- (decisão do dono, 19/10/2026): o gabarito é o definitivo da banca, registrado
-- em content/banco/provas-oficiais.json e conferido em teste. Para quem já
-- rodou as migrações 0018/0019 quando elas ainda entravam como 'revisao'.
-- Pode rodar de novo sem estragar nada.
update v2.questions set status = 'ativa', updated_at = now()
where fonte->>'tipo' = 'oficial' and status = 'revisao';
