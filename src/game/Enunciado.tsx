// Enunciado de questão. Questão de prova costuma ter contexto (situação
// hipotética, proposição, comando da banca) separado do item por uma linha em
// branco: o contexto vai em texto corrido e só o item fica em destaque.

export function Enunciado({ id, texto }: { id: string; texto: string }) {
  const blocos = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const item = blocos.pop() ?? texto;
  return (
    <>
      {blocos.length > 0 && (
        <div className="quiz-contexto">
          {blocos.map((b, i) => <p key={i}>{b}</p>)}
        </div>
      )}
      <h2 id={id} className="quiz-question">{item}</h2>
    </>
  );
}
