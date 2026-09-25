import { useAuth } from '../auth/AuthProvider';
import { Tico } from '../components/Tico';

// Tela inicial do app. O motor de questões chega na etapa 2.
export function Trilha() {
  const { me, meError, refreshMe } = useAuth();
  const firstName = me?.profile.displayName.split(/\s+/)[0];

  return (
    <>
      {meError && (
        <p className="alert alert-error" role="alert">
          {meError} <button type="button" className="link-btn" onClick={() => void refreshMe()}>Tentar de novo</button>
        </p>
      )}
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Sua trilha</p>
          <h1 className="page-title">{firstName ? `Olá, ${firstName}!` : 'Olá!'} Sua trilha está sendo preparada.</h1>
          <p>Em breve: capítulos, fases e questões de provas oficiais, com explicação em cada resposta.</p>
        </div>
        <Tico pose="acenando" />
      </section>
    </>
  );
}
