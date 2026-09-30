import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import type { TrailChapter, TrailPhase } from '../../shared/game';
import { useAuth } from '../auth/AuthProvider';
import { Icon } from '../components/Icon';
import { Tico } from '../components/Tico';
import { useProgress } from '../game/ProgressProvider';
import { LoadState, useLoad } from '../game/useLoad';
import { game } from '../lib/game';

function nextPhase(chapters: TrailChapter[]): { chapter: TrailChapter; phase: TrailPhase } | null {
  for (const chapter of chapters) for (const phase of chapter.fases) if (phase.status === 'available') return { chapter, phase };
  return null;
}

export function Trilha() {
  const { me } = useAuth();
  const { setProgress } = useProgress();
  const navigate = useNavigate();
  const loaded = useLoad(async () => {
    const t = await game.trail();
    setProgress(t.progress);
    return t.capitulos;
  }, []);
  const firstName = me?.profile.displayName.split(/\s+/)[0];
  const chapters = loaded.data ?? [];
  const { hash } = useLocation();
  // Vindo do mapa (/jogar#cap-03): rola até o capítulo.
  useEffect(() => {
    if (hash && loaded.data) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash, loaded.data]);
  const next = nextPhase(chapters);
  const proBlocked = chapters.flatMap((c) => c.fases).some((f) => f.status === 'pro');

  return (
    <>
      <section className="hero trail-hero">
        <div className="hero-text">
          <p className="eyebrow">Sua trilha</p>
          <h1 className="page-title">{firstName ? `Olá, ${firstName}!` : 'Olá!'} {next ? 'Bora para a próxima fase?' : proBlocked ? 'Você fechou a parte grátis!' : 'Trilha em dia.'}</h1>
          <p>{next ? `${next.chapter.titulo} · ${next.phase.titulo}` : proBlocked ? 'Os próximos capítulos são do plano PRO.' : 'Revise seus erros ou encare um desafio enquanto chegam novas fases.'}</p>
          {next && <button type="button" className="btn btn-primary trail-cta" onClick={() => navigate(`/fase/${next.phase.id}`)}>Continuar trilha</button>}
          {!next && proBlocked && <Link to="/planos" className="btn btn-primary trail-cta">Conhecer o PRO</Link>}
        </div>
        <Tico pose={next ? 'acenando' : 'comemorando'} />
      </section>

      <LoadState loaded={loaded}>
        <ol className="trail">
          {chapters.map((chapter, ci) => (
            <li key={chapter.id} id={chapter.id} className="trail-chapter">
              <header className="trail-chapter-head">
                <span className="trail-chapter-n">{ci + 1}</span>
                <div>
                  <p className="eyebrow">{chapter.disciplinaNome}{!chapter.gratis && ' · PRO'}</p>
                  <h2>{chapter.titulo}</h2>
                  <p className="muted">{chapter.descricao}</p>
                </div>
              </header>
              <ul className="trail-phases">
                {chapter.fases.map((phase) => <PhaseNode key={phase.id} phase={phase} />)}
              </ul>
            </li>
          ))}
        </ol>
      </LoadState>
    </>
  );
}

function PhaseNode({ phase }: { phase: TrailPhase }) {
  const label = `${phase.titulo} — ${phase.dominadas}/${phase.total} questões dominadas`;
  const inner = (
    <>
      <span className={`phase-dot phase-${phase.status}`} aria-hidden="true">
        {phase.status === 'done' ? '✓' : phase.status === 'pro' ? <Icon name="crown" size={20} /> : phase.status === 'locked' ? '🔒' : <Icon name="star" size={20} />}
      </span>
      <span className="phase-text">
        <strong>{phase.titulo}</strong>
        <span className="muted">{phase.status === 'done' ? 'Concluída · jogar de novo' : phase.status === 'available' ? `${phase.total} questões` : phase.status === 'pro' ? 'Plano PRO' : 'Conclua a fase anterior'}</span>
      </span>
    </>
  );
  return (
    <li>
      {phase.status === 'done' || phase.status === 'available' ? (
        <Link to={`/fase/${phase.id}`} className={`phase-node is-${phase.status}`} aria-label={label}>{inner}</Link>
      ) : phase.status === 'pro' ? (
        <Link to="/planos" className="phase-node is-pro" aria-label={`${phase.titulo} — disponível no plano PRO`}>{inner}</Link>
      ) : (
        <div className="phase-node is-locked" aria-label={`${phase.titulo} — bloqueada`}>{inner}</div>
      )}
    </li>
  );
}
