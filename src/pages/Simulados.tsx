// Simulados: montar (dificuldade, matérias, banca, tamanho, cronômetro),
// fazer como numa prova (gabarito só na entrega) e ver o resultado.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import type { DisciplinaId } from '../../content/types';
import {
  NIVEIS, NIVEL_DE, NIVEL_NOME, SIMULADO_SEG_POR_QUESTAO, SIMULADO_TAMANHOS,
  type Nivel, type SimuladoOpcoes, type SimuladoResultado, type SimuladoSessao,
} from '../../shared/game';
import { useAuth } from '../auth/AuthProvider';
import { Tico } from '../components/Tico';
import { useProgress } from '../game/ProgressProvider';
import { LoadState, useLoad } from '../game/useLoad';
import { ApiError } from '../lib/api';
import { formatDate } from '../lib/essay';
import { fonteLabel, game } from '../lib/game';

const NIVEL_TEXTO: Record<Nivel, string> = {
  facil: 'Para aquecer e ganhar confiança.',
  medio: 'O nível da maioria das questões de prova.',
  dificil: 'As que mais derrubam candidatos.',
  misto: 'Como numa prova: 30% fáceis, 50% médias, 20% difíceis.',
};
const DIF_NOME = { 1: 'Fácil', 2: 'Média', 3: 'Difícil' } as const;

function minutes(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m} min${s ? ` ${s} s` : ''}` : `${s} s`;
}

// ---------------------------------------------------------------- Montar
export function Simulados() {
  const loaded = useLoad(game.simulados, []);
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Simulados</p>
        <h1 className="page-title">Monte seu simulado</h1>
        <p className="muted">Escolha a dificuldade e as matérias. O gabarito só aparece quando você entregar, como na prova.</p>
      </header>
      <LoadState loaded={loaded}>{loaded.data && <Montar opcoes={loaded.data} />}</LoadState>
    </>
  );
}

function Montar({ opcoes }: { opcoes: SimuladoOpcoes }) {
  const navigate = useNavigate();
  const [nivel, setNivel] = useState<Nivel>('misto');
  const [disciplinas, setDisciplinas] = useState<DisciplinaId[]>(opcoes.disciplinas.map((d) => d.id));
  const [banca, setBanca] = useState<string>('');
  const [quantidade, setQuantidade] = useState(10);
  const [cronometro, setCronometro] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const disponiveis = useMemo(() => opcoes.contagem
    .filter((c) => disciplinas.includes(c.disciplina) && (!banca || c.banca === banca) && (nivel === 'misto' || c.dificuldade === NIVEL_DE[nivel]))
    .reduce((sum, c) => sum + c.n, 0), [opcoes.contagem, disciplinas, banca, nivel]);
  const porNivel = (n: Nivel) => opcoes.contagem
    .filter((c) => disciplinas.includes(c.disciplina) && (!banca || c.banca === banca) && (n === 'misto' || c.dificuldade === NIVEL_DE[n]))
    .reduce((sum, c) => sum + c.n, 0);

  // Se o tamanho escolhido não cabe mais, desce para o maior que cabe.
  useEffect(() => {
    if (quantidade > disponiveis) {
      const fits = [...SIMULADO_TAMANHOS].reverse().find((n) => n <= disponiveis);
      if (fits) setQuantidade(fits);
    }
  }, [disponiveis, quantidade]);

  const limite = opcoes.limite;
  const esgotado = limite.porDia !== null && limite.usadosHoje >= limite.porDia;
  const podeComecar = !opcoes.aberto && !esgotado && disciplinas.length > 0 && quantidade <= disponiveis;

  function toggle(id: DisciplinaId) {
    setDisciplinas((cur) => (cur.includes(id) ? cur.filter((d) => d !== id) : [...cur, id]));
  }

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const sessao = await game.startSimulado({ nivel, disciplinas, banca: banca || null, quantidade, cronometro });
      navigate(`/simulado/${sessao.id}`, { state: { sessao } });
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : 'Não foi possível montar o simulado.', code: err instanceof ApiError ? err.code : undefined });
      setStarting(false);
    }
  }

  return (
    <div className="sim-layout">
      <div className="sim-form">
        {opcoes.aberto && (
          <div className="alert alert-info sim-open" role="status">
            Você tem um simulado em andamento. <Link to={`/simulado/${opcoes.aberto}`}>Continuar</Link>
          </div>
        )}

        <fieldset className="sim-levels">
          <legend>Dificuldade</legend>
          {NIVEIS.map((n) => (
            <label key={n} className={`sim-level ${n === nivel ? 'is-on' : ''}`}>
              <input type="radio" name="nivel" value={n} checked={n === nivel} onChange={() => setNivel(n)} className="visually-hidden" />
              <strong>{NIVEL_NOME[n]}</strong>
              <span className="muted">{NIVEL_TEXTO[n]}</span>
              <span className="sim-count">{porNivel(n)} questões</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="chip-group">
          <legend>Matérias</legend>
          {opcoes.disciplinas.map((d) => (
            <label key={d.id} className={`chip ${disciplinas.includes(d.id) ? 'is-on' : ''}`}>
              <input type="checkbox" checked={disciplinas.includes(d.id)} onChange={() => toggle(d.id)} className="visually-hidden" />
              {disciplinas.includes(d.id) ? '✓ ' : ''}{d.nome}
            </label>
          ))}
        </fieldset>

        {opcoes.bancas.length > 0 && (
          <div className="field">
            <label htmlFor="banca">Banca</label>
            <select id="banca" value={banca} onChange={(e) => setBanca(e.target.value)}>
              <option value="">Todas</option>
              {opcoes.bancas.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <span className="field-hint">Inclui questões autorais no estilo da banca.</span>
          </div>
        )}

        <fieldset className="chip-group">
          <legend>Quantidade de questões</legend>
          {SIMULADO_TAMANHOS.map((n) => (
            <label key={n} className={`chip ${n === quantidade ? 'is-on' : ''} ${n > disponiveis ? 'is-off' : ''}`}>
              <input type="radio" name="quantidade" value={n} checked={n === quantidade} disabled={n > disponiveis} onChange={() => setQuantidade(n)} className="visually-hidden" />
              {n}
            </label>
          ))}
        </fieldset>

        <label className="sim-check">
          <input type="checkbox" checked={cronometro} onChange={(e) => setCronometro(e.target.checked)} />
          <span>Com cronômetro: {minutes(quantidade * SIMULADO_SEG_POR_QUESTAO)} ({SIMULADO_SEG_POR_QUESTAO / 60} min por questão, como na prova)</span>
        </label>

        <p className="muted sim-available">
          {disciplinas.length === 0 ? 'Escolha pelo menos uma matéria.'
            : disponiveis < SIMULADO_TAMANHOS[0]! ? 'Ainda há poucas questões com esses filtros. Escolha mais matérias ou outro nível.'
              : `${disponiveis} questões disponíveis com esses filtros.`}
        </p>

        {limite.porDia !== null && (
          <p className={`essay-quota ${esgotado ? 'is-used' : ''}`}>
            Plano Grátis · {limite.porDia} simulado por dia · {esgotado ? <>o de hoje já foi. <Link to="/planos">Ilimitados no PRO</Link></> : <strong>disponível agora</strong>}
          </p>
        )}
        {limite.porDia === null && <p className="essay-quota is-pro">PRO · simulados ilimitados</p>}
        {error && (
          <p className="alert alert-error" role="alert">
            {error.message}{error.code === 'LIMITE_SIMULADO' && <> <Link to="/planos">Conhecer o PRO</Link></>}
          </p>
        )}
        <button type="button" className="btn btn-primary" disabled={!podeComecar || starting} onClick={() => void start()}>
          {starting ? 'Montando…' : 'Começar simulado'}
        </button>
      </div>

      <aside className="card essay-history">
        <h2>Seus simulados</h2>
        {opcoes.historico.length === 0 ? <p className="muted">Os resultados aparecem aqui.</p> : (
          <ul>
            {opcoes.historico.map((h) => (
              <li key={h.id}>
                <Link to={`/simulado/${h.id}`}>
                  <span><strong>{NIVEL_NOME[h.nivel]} · {h.total} questões</strong><span className="muted">{formatDate(h.iniciadoEm, true)}</span></span>
                  <span className="essay-score-sm">{h.acertos === null ? 'em andamento' : `${h.acertos}/${h.total}`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- Fazer / resultado
export function SimuladoTela() {
  const { id = '' } = useParams();
  const passed = (useLocation().state as { sessao?: SimuladoSessao } | null)?.sessao;
  const loaded = useLoad(async () => (passed?.id === id ? { estado: 'aberto' as const, sessao: passed } : game.simulado(id)), [id]);
  const [resultado, setResultado] = useState<SimuladoResultado | null>(null);
  const data = loaded.data;
  if (resultado) return <Resultado r={resultado} />;
  return (
    <LoadState loaded={loaded}>
      {data && (data.estado === 'entregue' ? <Resultado r={data.resultado} /> : <Prova sessao={data.sessao} onDone={setResultado} />)}
    </LoadState>
  );
}

// Respostas guardadas no navegador enquanto a prova está aberta (recarregar
// a página não perde nada). Pode falhar em janela anônima: aí só não guarda.
const keyOf = (userId: string, id: string) => `aprovatico:simulado:${userId}:${id}`;
function readAnswers(key: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, number>; } catch { return {}; }
}
function writeAnswers(key: string, v: Record<string, number> | null) {
  try { if (v) localStorage.setItem(key, JSON.stringify(v)); else localStorage.removeItem(key); } catch { /* sem armazenamento */ }
}

function Prova({ sessao, onDone }: { sessao: SimuladoSessao; onDone: (r: SimuladoResultado) => void }) {
  const { session } = useAuth();
  const { setProgress } = useProgress();
  const key = keyOf(session?.user.id ?? 'anon', sessao.id);
  const [answers, setAnswers] = useState<Record<string, number>>(() => readAnswers(key));
  const [i, setI] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deadline = sessao.prazo ? new Date(sessao.prazo).getTime() : null;
  const [left, setLeft] = useState(() => (deadline ? Math.max(0, Math.round((deadline - Date.now()) / 1000)) : 0));
  const sent = useRef(false);
  const q = sessao.questoes[i]!;
  const total = sessao.questoes.length;
  const answered = sessao.questoes.filter((x) => answers[x.id] !== undefined).length;

  useEffect(() => writeAnswers(key, answers), [key, answers]);

  const deliver = useCallback(async () => {
    if (sent.current) return;
    sent.current = true;
    setSending(true);
    setError(null);
    try {
      const r = await game.deliverSimulado(sessao.id, answers);
      writeAnswers(key, null);
      setProgress(r.progress);
      onDone(r.resultado);
    } catch (err) {
      sent.current = false;
      setSending(false);
      setError(err instanceof Error ? err.message : 'Não foi possível entregar. Tente de novo.');
    }
  }, [answers, key, onDone, sessao.id, setProgress]);

  // Cronômetro: ao zerar, entrega sozinho.
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) void deliver();
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, deliver]);

  const choose = (choice: number) => setAnswers((a) => ({ ...a, [q.id]: choice }));

  // Teclado: 1–5 marca, ← → navega.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (confirming || sending || (e.target as HTMLElement).tagName === 'SELECT') return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.alternativas.length) choose(n - 1);
      else if (e.key === 'ArrowRight') setI((x) => Math.min(total - 1, x + 1));
      else if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="sim-run">
      <header className="sim-run-top">
        <div>
          <p className="eyebrow">Simulado {NIVEL_NOME[sessao.nivel]}</p>
          <strong>Questão {i + 1} de {total}</strong> <span className="muted sim-answered">· {answered} respondidas</span>
        </div>
        {deadline && (
          <span className={`sim-timer ${left <= 60 ? 'is-low' : ''}`} role="timer" aria-label={`Tempo restante: ${Math.floor(left / 60)} minutos e ${left % 60} segundos`}>
            ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)} disabled={sending}>Entregar</button>
      </header>

      <article className="quiz-card card" aria-labelledby="sim-q">
        <p className="eyebrow">{q.assunto} · {fonteLabel(q.fonte)}</p>
        <h2 id="sim-q" className="quiz-question">{q.enunciado}</h2>
        <div className="demo-options" role="radiogroup" aria-label="Alternativas">
          {q.alternativas.map((alt, k) => (
            <button key={alt} type="button" role="radio" aria-checked={answers[q.id] === k}
              className={`demo-option ${answers[q.id] === k ? 'is-selected' : ''}`} onClick={() => choose(k)}>
              <span className="demo-letter">{String.fromCharCode(65 + k)}</span>{alt}
            </button>
          ))}
        </div>
      </article>

      <div className="sim-nav">
        <button type="button" className="btn btn-secondary" disabled={i === 0} onClick={() => setI(i - 1)}>← Anterior</button>
        {i < total - 1
          ? <button type="button" className="btn btn-primary" onClick={() => setI(i + 1)}>Próxima →</button>
          : <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>Revisar e entregar</button>}
      </div>

      <nav className="sim-grid" aria-label="Ir para a questão">
        {sessao.questoes.map((x, k) => (
          <button key={x.id} type="button" onClick={() => setI(k)} aria-current={k === i ? 'step' : undefined}
            className={`${answers[x.id] !== undefined ? 'is-done' : ''} ${k === i ? 'is-here' : ''}`}
            aria-label={`Questão ${k + 1}${answers[x.id] !== undefined ? ', respondida' : ''}`}>
            {k + 1}
          </button>
        ))}
      </nav>

      {confirming && (
        <div className="sim-confirm card" role="dialog" aria-modal="false" aria-labelledby="sim-confirm-t">
          <h2 id="sim-confirm-t">Entregar o simulado?</h2>
          <p>Você respondeu <strong>{answered} de {total}</strong>.{answered < total ? ' As em branco contam como erro.' : ''} Depois de entregar não dá para mudar.</p>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <div className="quiz-end-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={sending}>Voltar às questões</button>
            <button type="button" className="btn btn-primary" onClick={() => void deliver()} disabled={sending}>{sending ? 'Corrigindo…' : 'Entregar agora'}</button>
          </div>
        </div>
      )}
      {!confirming && error && <p className="alert alert-error" role="alert">{error}</p>}
    </div>
  );
}

function Resultado({ r }: { r: SimuladoResultado }) {
  // Vindo da prova (rolada lá embaixo), começa do topo do resultado.
  useEffect(() => { document.getElementById('sim-result')?.scrollIntoView?.({ block: 'start' }); }, [r.id]);
  // Em branco não vai para a revisão (não houve resposta para corrigir).
  const erros = r.questoes.filter((q) => q.escolha !== null && q.escolha !== q.correta).length;
  return (
    <div className="sim-result" id="sim-result">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Simulado {NIVEL_NOME[r.nivel]} · resultado</p>
          <h1 className="page-title">Você acertou {r.acertos} de {r.total} ({r.pct}%)</h1>
          <ul className="sim-facts">
            <li>⏱ {minutes(r.tempoSeg)} no total · {minutes(Math.round(r.tempoSeg / Math.max(1, r.total)))} por questão</li>
            {r.respondidas < r.total && <li>{r.total - r.respondidas} em branco</li>}
            <li>+{r.xpGanho} XP</li>
            {r.percentil !== null && <li><strong>Melhor que {r.percentil}%</strong> dos simulados {NIVEL_NOME[r.nivel].toLowerCase()}s</li>}
          </ul>
          <div className="quiz-end-actions sim-actions">
            {erros > 0 && <Link to="/revisar" className="btn btn-primary">Revisar os erros ({erros})</Link>}
            <Link to="/simulados" className={`btn ${erros > 0 ? 'btn-secondary' : 'btn-primary'}`}>Novo simulado</Link>
          </div>
        </div>
        <Tico pose={r.pct >= 70 ? 'comemorando' : r.pct >= 40 ? 'joinha' : 'apontando'} />
      </section>

      <h2 className="section-title">Por matéria</h2>
      <ul className="list-cards">
        {r.porDisciplina.map((d) => (
          <li key={d.disciplina} className="card mission">
            <div className="mission-main">
              <strong>{d.nome} <span className="muted">· {d.acertos}/{d.total}</span></strong>
              <div className="bar" role="progressbar" aria-label={`${d.nome}: ${d.acertos} de ${d.total}`} aria-valuemin={0} aria-valuemax={d.total} aria-valuenow={d.acertos}>
                <span style={{ width: `${(d.acertos / Math.max(1, d.total)) * 100}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="section-title">Gabarito comentado</h2>
      <ol className="sim-review">
        {r.questoes.map((q, k) => {
          const ok = q.escolha === q.correta;
          return (
            <li key={q.id} className={`card ${ok ? 'is-right' : 'is-wrong'}`}>
              <p className="eyebrow">
                Questão {k + 1} · {ok ? 'acertou' : q.escolha === null ? 'em branco' : 'errou'} · {DIF_NOME[q.dificuldade]}
                {q.acerto !== null && ` · ${q.acerto}% acertam`}
              </p>
              <p className="sim-review-q">{q.enunciado}</p>
              <ul className="sim-alts">
                {q.alternativas.map((alt, j) => (
                  <li key={alt} className={j === q.correta ? 'is-correct' : j === q.escolha ? 'is-wrong' : ''}>
                    <span className="demo-letter">{String.fromCharCode(65 + j)}</span>{alt}
                    {j === q.correta && <span className="visually-hidden"> (resposta certa)</span>}
                    {j === q.escolha && j !== q.correta && <span className="visually-hidden"> (sua resposta)</span>}
                  </li>
                ))}
              </ul>
              <p className="sim-explain">{q.explicacao}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
