import { Link } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { BRAND } from '../app/nav';
import { Icon, type IconName } from '../components/Icon';
import { Tico } from '../components/Tico';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'compass', title: 'Trilha guiada', text: 'Capítulos e fases curtas, do básico ao nível de prova, com questões de concursos reais.' },
  { icon: 'pen', title: 'Redação com IA', text: 'Escreva no padrão da sua banca e receba nota por critério e trechos para revisar.' },
  { icon: 'target', title: 'Missões e ranking', text: 'Metas diárias, sequência de dias estudando e ranking para manter o ritmo.' },
];

// Página inicial pública. Quem já está logado vê "Continuar" (sem ser
// jogado para dentro do app automaticamente).
export function Landing() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="brand">
          <span className="brand-mark"><Icon name="compass" /></span>
          <span>{BRAND.first} {BRAND.second}<span className="brand-accent">.</span></span>
        </Link>
        <nav className="landing-actions" aria-label="Conta">
          {signedIn ? (
            <Link to="/jogar" className="btn btn-primary">Continuar estudando</Link>
          ) : (
            <>
              <Link to="/entrar" className="btn btn-secondary">Entrar</Link>
              <Link to="/cadastro" className="btn btn-primary">Criar conta</Link>
            </>
          )}
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero landing-hero">
          <div className="hero-text">
            <p className="eyebrow">Estudo para concursos, em forma de aventura</p>
            <h1 className="landing-title">Sua aprovação, uma fase de cada vez.</h1>
            <p>Questões de provas oficiais, explicações diretas e uma trilha que mostra exatamente o próximo passo.</p>
            <div className="landing-cta">
              <Link to={signedIn ? '/jogar' : '/cadastro'} className="btn btn-primary">{signedIn ? 'Continuar minha trilha' : 'Começar grátis'}</Link>
              {!signedIn && <Link to="/entrar" className="btn btn-secondary">Já tenho conta</Link>}
            </div>
          </div>
          <Tico pose="acenando" />
        </section>

        <section className="feature-grid" aria-label="O que tem no app">
          {FEATURES.map((f) => (
            <article key={f.title} className="card feature">
              <span className="feature-icon"><Icon name={f.icon} /></span>
              <h2>{f.title}</h2>
              <p className="muted">{f.text}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="landing-footer muted">© {new Date().getFullYear()} {BRAND.first} {BRAND.second}</footer>
    </div>
  );
}
