// Enunciado de questão. Questão de prova costuma ter contexto (texto de apoio,
// situação hipotética, proposição, comando da banca) separado do item por uma
// linha em branco: o contexto vai em texto corrido e só o item fica em destaque.
// Texto de apoio longo fica numa caixa que dá para recolher (aberta no começo),
// com o comando da banca logo abaixo, fora dela.

const LONGO = 500;
const TITULO_MAX = 60;

export function Enunciado({ id, texto }: { id: string; texto: string }) {
  const blocos = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const item = blocos.pop() ?? texto;
  const longo = blocos.join('').length > LONGO && blocos.length > 1;
  const comando = longo ? blocos.pop()! : null;
  const titulo = longo && blocos[0]!.length <= TITULO_MAX ? blocos.shift()! : 'Texto de apoio';
  return (
    <>
      {longo ? (
        <>
          <details className="quiz-contexto quiz-texto" open>
            <summary>{titulo}</summary>
            {blocos.map((b, i) => <p key={i}>{b}</p>)}
          </details>
          <p className="quiz-comando">{comando}</p>
        </>
      ) : blocos.length > 0 && (
        <div className="quiz-contexto">
          {blocos.map((b, i) => <p key={i}>{b}</p>)}
        </div>
      )}
      <h2 id={id} className="quiz-question">{item}</h2>
    </>
  );
}
