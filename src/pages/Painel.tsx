// Missões, conquistas, ranking, disciplinas e mapa da aventura.

import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../components/Icon';
import { Tico } from '../components/Tico';
import { useProgress } from '../game/ProgressProvider';
import { LoadState, useLoad } from '../game/useLoad';
import { game } from '../lib/game';

function PageHead({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <header className="page-head">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      {text && <p className="muted">{text}</p>}
    </header>
  );
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

export function Missoes() {
  const { setProgress } = useProgress();
  const loaded = useLoad(game.missions, []);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function claim(id: string) {
    setClaiming(id);
    setMessage(null);
    try {
      const r = await game.claim(id);
      setProgress(r.progress);
      setMessage(`+${r.xpGanho} XP resgatados!`);
      loaded.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível resgatar.');
    } finally {
      setClaiming(null);
    }
  }

  return (
    <>
      <PageHead eyebrow="Missões diárias" title="Metas de hoje" text="Renovam à meia-noite (horário de Brasília). Complete e resgate o XP." />
      {message && <p className="alert alert-success" role="status">{message}</p>}
      <LoadState loaded={loaded}>
        <ul className="list-cards">
          {loaded.data?.missoes.map((m) => {
            const complete = m.atual >= m.meta;
            return (
              <li key={m.id} className="card mission">
                <div className="mission-main">
                  <strong>{m.titulo}</strong>
                  <Bar value={m.atual} max={m.meta} label={`${m.titulo}: ${m.atual} de ${m.meta}`} />
                  <span className="muted">{m.atual}/{m.meta} · +{m.xp} XP</span>
                </div>
                {m.resgatada ? (
                  <span className="pill pill-done">Resgatada ✓</span>
                ) : complete ? (
                  <button type="button" className="btn btn-primary" disabled={claiming === m.id} onClick={() => void claim(m.id)}>
                    {claiming === m.id ? 'Resgatando…' : 'Resgatar'}
                  </button>
                ) : (
                  <span className="pill">Em andamento</span>
                )}
              </li>
            );
          })}
        </ul>
      </LoadState>
    </>
  );
}

export function Conquistas() {
  const loaded = useLoad(game.achievements, []);
  const done = loaded.data?.conquistas.filter((c) => c.conquistada).length ?? 0;
  return (
    <>
      <PageHead eyebrow="Conquistas" title={`${done} de ${loaded.data?.conquistas.length ?? '…'} conquistadas`} />
      <LoadState loaded={loaded}>
        <ul className="badge-grid">
          {loaded.data?.conquistas.map((c) => (
            <li key={c.id} className={`card badge ${c.conquistada ? 'is-earned' : ''}`}>
              <span className="badge-icon" aria-hidden="true"><Icon name={c.conquistada ? 'medal' : 'star'} /></span>
              <strong>{c.titulo}</strong>
              <span className="muted">{c.descricao}</span>
              <span className="visually-hidden">{c.conquistada ? 'Conquistada' : 'Ainda não conquistada'}</span>
            </li>
          ))}
        </ul>
      </LoadState>
    </>
  );
}

export function Ranking() {
  const loaded = useLoad(game.ranking, []);
  const inTop = loaded.data?.top.some((t) => t.voce);
  return (
    <>
      <PageHead eyebrow="Ranking" title="Quem mais estudou" text="Pontuação total de XP. Acerte questões novas e conclua fases para subir." />
      <LoadState loaded={loaded}>
        {loaded.data && (loaded.data.top.length === 0 ? (
          <p className="muted">Ninguém pontuou ainda. Responda a primeira questão e seja o primeiro!</p>
        ) : (
          <div className="table-wrap">
            <table className="ranking">
              <thead><tr><th scope="col">#</th><th scope="col">Aluno</th><th scope="col">XP</th></tr></thead>
              <tbody>
                {loaded.data.top.map((t) => (
                  <tr key={t.posicao} className={t.voce ? 'is-you' : ''}>
                    <td>{t.posicao}</td><td>{t.nome}{t.voce && ' (você)'}</td><td>{t.xp}</td>
                  </tr>
                ))}
                {!inTop && (
                  <tr className="is-you">
                    <td>{loaded.data.voce.posicao}</td><td>Você</td><td>{loaded.data.voce.xp}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </LoadState>
    </>
  );
}

export function Disciplinas() {
  const loaded = useLoad(game.subjects, []);
  return (
    <>
      <PageHead eyebrow="Disciplinas" title="Seu desempenho por matéria" text="Pratique as questões das fases que você já abriu. Praticar não gasta vidas." />
      <LoadState loaded={loaded}>
        <ul className="list-cards">
          {loaded.data?.disciplinas.map((d) => (
            <li key={d.disciplina} className="card subject">
              <div className="mission-main">
                <strong>{d.nome}</strong>
                <Bar value={d.dominadas} max={d.total} label={`${d.nome}: ${d.dominadas} de ${d.total} dominadas`} />
                <span className="muted">{d.dominadas}/{d.total} dominadas{d.pendentes ? ` · ${d.pendentes} para revisar` : ''}</span>
              </div>
              {d.liberadas > 0 ? (
                <Link to={`/praticar/${d.disciplina}`} className="btn btn-secondary">Praticar</Link>
              ) : (
                <span className="pill">Abre na trilha</span>
              )}
            </li>
          ))}
        </ul>
      </LoadState>
    </>
  );
}

export function Aventura() {
  const loaded = useLoad(game.trail, []);
  return (
    <>
      <PageHead eyebrow="Aventura" title="O mapa da sua jornada" text="Cada ilha é um capítulo. Toque para ir até ele na trilha." />
      <LoadState loaded={loaded}>
        <ol className="map">
          {loaded.data?.capitulos.map((c, i) => {
            const done = c.fases.filter((f) => f.status === 'done').length;
            const state = done === c.fases.length ? 'done' : c.fases.some((f) => f.status === 'available' || f.status === 'done') ? 'open' : c.fases.some((f) => f.status === 'pro') || !c.gratis ? 'pro' : 'locked';
            return (
              <li key={c.id} className={`island is-${state}`}>
                <Link to={`/jogar#${c.id}`}>
                  <span className="island-n">{i + 1}</span>
                  <strong>{c.titulo}</strong>
                  <span className="muted">{c.disciplinaNome}</span>
                  <span className="island-state">{state === 'done' ? 'Concluído ✓' : state === 'pro' ? 'PRO' : state === 'locked' ? 'Bloqueado' : `${done}/${c.fases.length} fases`}</span>
                </Link>
              </li>
            );
          })}
        </ol>
        <div className="map-foot"><Tico pose="apontando" className="tico map-tico" /></div>
      </LoadState>
    </>
  );
}
