import { useAuth } from '../auth/AuthProvider';
import { Tico } from '../components/Tico';
import { Practice } from './trilha/Practice';

// Tela inicial do app. Por enquanto: treino rápido por matéria. Capítulos,
// fases, XP e vidas chegam no resto da etapa 2.
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
          <p>Em breve: capítulos e fases. Enquanto isso, treine abaixo com questões no estilo da sua banca.</p>
        </div>
        <Tico pose="acenando" />
      </section>
      <Practice />
    </>
  );
}
