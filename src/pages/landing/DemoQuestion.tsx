import { useState } from 'react';
import { Link } from 'react-router';

const OPTIONS = ['60%', '70%', '75%', '80%'];
const CORRECT = 2;

// Uma questão de verdade para experimentar antes de criar conta — o mesmo
// formato de cada fase da trilha: responder, conferir, entender o porquê.
export function DemoQuestion() {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const right = checked && selected === CORRECT;

  return (
    <div className="demo-question card" aria-labelledby="demo-q-title">
      <p className="eyebrow">Experimente agora · Raciocínio lógico</p>
      <h3 id="demo-q-title">Em um simulado de 40 questões, você acertou 30. Qual foi o seu percentual de acertos?</h3>
      <div className="demo-options" role="radiogroup" aria-label="Alternativas">
        {OPTIONS.map((option, i) => {
          const state = checked ? (i === CORRECT ? 'is-correct' : i === selected ? 'is-wrong' : '') : i === selected ? 'is-selected' : '';
          return (
            <button
              key={option} type="button" role="radio" aria-checked={selected === i}
              className={`demo-option ${state}`} disabled={checked} onClick={() => setSelected(i)}
            >
              <span className="demo-letter">{String.fromCharCode(65 + i)}</span>{option}
            </button>
          );
        })}
      </div>
      {!checked ? (
        <button type="button" className="btn btn-primary btn-block" disabled={selected === null} onClick={() => setChecked(true)}>
          Conferir resposta
        </button>
      ) : (
        <div className={`demo-feedback ${right ? 'is-right' : 'is-wrong'}`} role="status">
          <strong>{right ? 'Acertou! +10 XP' : 'Quase! A resposta é 75%.'}</strong>
          <p>30 ÷ 40 = 0,75. Multiplicando por 100, você chega a 75%. Na trilha, toda questão vem com uma explicação assim.</p>
          <Link to="/cadastro" className="btn btn-primary btn-block">Continuar na trilha — é grátis</Link>
        </div>
      )}
    </div>
  );
}
