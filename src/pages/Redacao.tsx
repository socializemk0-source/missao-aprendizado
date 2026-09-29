// Redação: escolher banca e tema, escrever, pedir a correção da IA, ver o
// relatório (com os trechos marcados no texto) e o histórico.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { CRITERIOS, type BancaRedacao } from '../../content/redacao';
import type { Essay, EssayQuota } from '../../shared/essay';
import { useAuth } from '../auth/AuthProvider';
import { Tico } from '../components/Tico';
import { LoadState, useLoad } from '../game/useLoad';
import { ApiError } from '../lib/api';
import { countWords, drafts, essayApi, formatDate, highlight, type EssayConfig } from '../lib/essay';

export function Redacao() {
  const loaded = useLoad(essayApi.config, []);
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Redação</p>
        <h1 className="page-title">Escreva e receba a correção da IA</h1>
        <p className="muted">Nota por critério, trechos do seu texto comentados e próximos passos no padrão da banca.</p>
      </header>
      <LoadState loaded={loaded}>{loaded.data && <Editor config={loaded.data} />}</LoadState>
    </>
  );
}

function QuotaNote({ cota }: { cota: EssayQuota }) {
  if (cota.plano === 'pro') return <p className="essay-quota is-pro">PRO · correções ilimitadas</p>;
  if (!cota.proximaEm) return <p className="essay-quota">Plano Grátis · 1 correção a cada 7 dias · <strong>disponível agora</strong></p>;
  return (
    <p className="essay-quota is-used">
      Plano Grátis · próxima correção em <strong>{formatDate(cota.proximaEm, true)}</strong>. <Link to="/planos">Correções ilimitadas no PRO</Link>
    </p>
  );
}

function Editor({ config }: { config: EssayConfig }) {
  const { me, session } = useAuth();
  const userId = session?.user.id ?? 'anon';
  const navigate = useNavigate();
  const preferred = config.bancas.find((b) => b === me?.profile.preferredBanca);
  const [bank, setBank] = useState<BancaRedacao>(preferred ?? config.bancas[0]!);
  const topics = useMemo(() => config.temas.filter((t) => t.bank === bank), [config.temas, bank]);
  const [topicId, setTopicId] = useState(topics[0]?.id ?? '');
  const topic = config.temas.find((t) => t.id === topicId) ?? topics[0];
  const [text, setText] = useState(() => (topic ? drafts.read(userId, topic.id) : ''));
  const [cota, setCota] = useState(config.cota);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const guide = config.guias[bank];
  const words = countWords(text);
  const tooShort = words < config.minWords;
  const tooLong = text.length > config.maxChars;
  const blocked = cota.plano === 'free' && Boolean(cota.proximaEm);

  function chooseBank(b: BancaRedacao) {
    setBank(b);
    const first = config.temas.find((t) => t.bank === b);
    if (first) chooseTopic(first.id);
  }
  function chooseTopic(id: string) {
    setTopicId(id);
    setText(drafts.read(userId, id));
    setError(null);
  }
  useEffect(() => {
    if (!topic) return;
    const t = setTimeout(() => drafts.write(userId, topic.id, text), 400);
    return () => clearTimeout(t);
  }, [text, topic, userId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!topic || tooShort || tooLong || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await essayApi.grade({ topicId: topic.id, bank, text });
      drafts.write(userId, topic.id, '');
      const essay: Essay = { id: r.id, topicId: topic.id, topicTitle: topic.title, banca: bank, score: r.score, createdAt: new Date().toISOString(), content: text, report: r.report };
      navigate(`/redacao/${r.id}`, { state: { essay } });
    } catch (err) {
      if (err instanceof ApiError && err.data.cota) setCota(err.data.cota as EssayQuota);
      setError({ message: err instanceof Error ? err.message : 'Não foi possível corrigir agora.', code: err instanceof ApiError ? err.code : undefined });
      setSending(false);
    }
  }

  return (
    <div className="essay-layout">
      <form className="essay-main" onSubmit={onSubmit}>
        <fieldset className="chip-group">
          <legend>Banca</legend>
          {config.bancas.map((b) => (
            <label key={b} className={`chip ${b === bank ? 'is-on' : ''}`}>
              <input type="radio" name="banca" value={b} checked={b === bank} onChange={() => chooseBank(b)} className="visually-hidden" />
              {config.guias[b].icon} {b}
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="tema">Tema</label>
          <select id="tema" value={topic?.id ?? ''} onChange={(e) => chooseTopic(e.target.value)}>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>

        {topic && (
          <article className="card essay-prompt">
            <h2>{topic.title}</h2>
            <p>{topic.prompt}</p>
            <p className="essay-support"><strong>Texto de apoio:</strong> {topic.support}</p>
            <p className="eyebrow">Roteiro</p>
            <ul>{topic.questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </article>
        )}

        <div className="field">
          <label htmlFor="texto">Seu texto</label>
          <textarea
            id="texto" className="essay-text" value={text} onChange={(e) => setText(e.target.value)} rows={16}
            placeholder="Escreva aqui. O rascunho fica salvo neste navegador enquanto você escreve."
            aria-describedby="texto-contagem"
          />
          <span id="texto-contagem" className={`field-hint ${tooLong ? 'is-bad' : ''}`}>
            {words} {words === 1 ? 'palavra' : 'palavras'}{tooShort ? ` · mínimo ${config.minWords}` : ' ✓'} · {text.length.toLocaleString('pt-BR')}/{config.maxChars.toLocaleString('pt-BR')} caracteres
          </span>
        </div>

        <QuotaNote cota={cota} />
        {!config.enabled && <p className="alert alert-error" role="alert">A correção por IA está desligada no momento. Seu rascunho continua salvo.</p>}
        {error && (
          <p className="alert alert-error" role="alert">
            {error.message}{error.code === 'LIMITE_PLANO_GRATIS' && <> <Link to="/planos">Conhecer o PRO</Link></>}
          </p>
        )}
        <div className="essay-actions">
          <button type="submit" className="btn btn-primary" disabled={!config.enabled || blocked || tooShort || tooLong || sending || !topic}>
            {sending ? 'Corrigindo… (até 1 minuto)' : 'Corrigir com IA'}
          </button>
          <span className="muted essay-privacy">Só o texto vai para a OpenAI, que não o guarda nem usa para treino.</span>
        </div>
        {sending && <p className="muted" role="status">O Tico está lendo seu texto com a régua da {guide.shortName}…</p>}
      </form>

      <aside className="essay-side">
        <details className="card essay-guide" open>
          <summary>{guide.icon} Como a {guide.shortName} corrige</summary>
          <p className="pill">{guide.badge}</p>
          <p><strong>Tamanho:</strong> {guide.idealLines}</p>
          <p><strong>Estrutura:</strong> {guide.structure}</p>
          <p className="eyebrow">Valoriza</p>
          <ul>{guide.loves.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="eyebrow">Evite</p>
          <ul>{guide.avoids.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="muted"><small>{guide.formula}</small></p>
        </details>
        <section className="card essay-history" aria-labelledby="hist">
          <h2 id="hist">Suas redações</h2>
          {config.historico.length === 0 ? <p className="muted">As correções aparecem aqui.</p> : (
            <ul>
              {config.historico.map((h) => (
                <li key={h.id}>
                  <Link to={`/redacao/${h.id}`}>
                    <span><strong>{h.topicTitle}</strong><span className="muted">{h.banca} · {formatDate(h.createdAt)}</span></span>
                    <span className="essay-score-sm">{h.score}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- Relatório
export function RedacaoRelatorio() {
  const { id = '' } = useParams();
  const passed = (useLocation().state as { essay?: Essay } | null)?.essay;
  const fromState = passed?.id === id ? passed : null;
  const loaded = useLoad(async () => fromState ?? (await essayApi.get(id)).redacao, [id]);
  return <LoadState loaded={loaded}>{loaded.data && <Report essay={loaded.data} />}</LoadState>;
}

const criterio = (id: string) => CRITERIOS.find((c) => c.id === id);

function Report({ essay }: { essay: Essay }) {
  const { report } = essay;
  const parts = highlight(essay.content, report.annotations.map((a) => a.quote));
  const max = (id: string) => criterio(id)?.max ?? 0;
  const label = (id: string) => criterio(id)?.label ?? id;
  return (
    <div className="essay-report">
      <header className="hero essay-report-head">
        <div className="hero-text">
          <p className="eyebrow">{essay.banca} · {formatDate(essay.createdAt, true)}</p>
          <h1 className="page-title">{essay.topicTitle}</h1>
          <p>{report.summary}</p>
          <Link to="/redacao" className="btn btn-secondary trail-cta">Nova redação</Link>
        </div>
        <div className="essay-score" aria-label={`Nota ${essay.score} de 100`}>
          <strong>{essay.score}</strong><span>/100</span>
          <Tico pose={essay.score >= 70 ? 'comemorando' : 'joinha'} className="tico essay-score-tico" />
        </div>
      </header>

      <section aria-labelledby="crit">
        <h2 id="crit" className="section-title">Nota por critério</h2>
        <ul className="list-cards">
          {report.criteria.map((c) => (
            <li key={c.id} className="card mission">
              <div className="mission-main">
                <strong>{label(c.id)} <span className="muted">· {c.score}/{max(c.id)}</span></strong>
                <div className="bar" role="progressbar" aria-label={`${label(c.id)}: ${c.score} de ${max(c.id)}`} aria-valuemin={0} aria-valuemax={max(c.id)} aria-valuenow={c.score}>
                  <span style={{ width: `${(c.score / Math.max(1, max(c.id))) * 100}%` }} />
                </div>
                <span className="muted">{c.reason}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="essay-report-grid">
        <section aria-labelledby="txt">
          <h2 id="txt" className="section-title">Seu texto</h2>
          <div className="card essay-annotated">
            {parts.map((p, i) => p.mark === null ? <span key={i}>{p.text}</span> : (
              <mark key={i} id={`trecho-${p.mark + 1}`}>{p.text}<sup>{p.mark + 1}</sup></mark>
            ))}
          </div>
        </section>
        <section aria-labelledby="notes">
          <h2 id="notes" className="section-title">Comentários</h2>
          {report.annotations.length === 0 ? <p className="muted">Nenhum trecho específico para ajustar.</p> : (
            <ol className="essay-notes">
              {report.annotations.map((a, i) => (
                <li key={i} className="card">
                  <p className="essay-quote"><a href={`#trecho-${i + 1}`}>{i + 1}</a> “{a.quote}”</p>
                  <p><strong>Problema:</strong> {a.issue}</p>
                  <p><strong>Como melhorar:</strong> {a.suggestion}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="essay-report-grid">
        {report.strengths.length > 0 && (
          <section className="card" aria-labelledby="good">
            <h2 id="good" className="section-title">Pontos fortes</h2>
            <ul>{report.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
          </section>
        )}
        <section className="card" aria-labelledby="next">
          <h2 id="next" className="section-title">Próximos passos</h2>
          <ul>{report.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      </div>
    </div>
  );
}
