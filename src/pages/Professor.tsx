// Revisão das questões por professor. Uma questão por vez, com gabarito e
// explicação. Quem decide se a pessoa pode revisar (e o quê) é o servidor.

import { useCallback, useEffect, useState } from 'react';
import type { DisciplinaId } from '../../content/types';
import { MATERIAS } from '../games/info';
import { ApiError } from '../lib/api';
import { professorApi, type AcaoRevisao, type FilaRevisao, type ItemFila } from '../lib/professor';

const LETRAS = 'ABCDEFGHIJ';
const DIFICULDADE = { 1: 'fácil', 2: 'média', 3: 'difícil' } as const;
const nomeDisciplina = (id: DisciplinaId) => MATERIAS.find((m) => m.id === id)?.nome ?? id;
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

function origemTexto(q: ItemFila): string {
  const onde = q.origem === 'trilha' ? 'Trilha (já no app)' : 'Banco de questões';
  const fonte = q.fonte.tipo === 'oficial'
    ? `${q.fonte.banca} ${q.fonte.ano} · ${q.fonte.orgao} · ${q.fonte.cargo}`
    : `autoral${q.fonte.estilo ? `, estilo ${q.fonte.estilo}` : ''}`;
  return `${onde} · ${fonte} · ${DIFICULDADE[q.dificuldade]}`;
}

export function Professor() {
  const [dados, setDados] = useState<FilaRevisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [negado, setNegado] = useState<string | null>(null);
  const [aba, setAba] = useState<'pendente' | 'correcao'>('pendente');
  const [materia, setMateria] = useState<string>('');
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setDados(await professorApi.fila());
      setErro(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setNegado(err.message);
      else setErro(err instanceof Error ? err.message : 'Não foi possível carregar.');
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  if (negado) {
    return (
      <section className="page-head">
        <h1 className="page-title">Revisão de questões</h1>
        <p className="muted">{negado} Se você é professor e deveria ter acesso, fale com a coordenação.</p>
      </section>
    );
  }
  if (!dados) return erro ? <p className="alert alert-error" role="alert">{erro}</p> : <p className="muted">Carregando…</p>;

  const materias = [...new Set(dados.fila.map((q) => q.disciplina))];
  const daMateria = dados.fila.filter((q) => !materia || q.disciplina === materia);
  const pendentes = daMateria.filter((q) => q.situacao === 'pendente');
  const correcao = daMateria.filter((q) => q.situacao === 'correcao');
  const lista = aba === 'pendente' ? pendentes : correcao;
  const atual = lista[0];

  async function decidir(item: ItemFila, acao: AcaoRevisao, nota?: string) {
    try {
      await professorApi.decidir(item, acao, nota);
      setAviso(acao === 'aprovar' ? 'Aprovada. Ela já pode aparecer para os alunos (em até 5 minutos).'
        : acao === 'corrigir' ? 'Pedido de correção enviado. A questão volta para você depois de corrigida.'
          : 'Questão descartada. Ela não aparece para os alunos.');
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
    }
    await carregar();
  }

  return (
    <div className="professor">
      <header className="page-head">
        <h1 className="page-title">Revisão de questões</h1>
        <p className="muted">
          {dados.revisor.nome ? `Olá, ${dados.revisor.nome}. ` : ''}
          Aprove só o que estiver correto e claro para o aluno. {pendentes.length} para revisar · {correcao.length} com correção pedida.
        </p>
      </header>

      <div className="professor-barra">
        <div className="professor-abas" role="group" aria-label="Lista">
          <button type="button" className={`chip${aba === 'pendente' ? ' is-on' : ''}`} aria-pressed={aba === 'pendente'} onClick={() => setAba('pendente')}>
            Para revisar ({pendentes.length})
          </button>
          <button type="button" className={`chip${aba === 'correcao' ? ' is-on' : ''}`} aria-pressed={aba === 'correcao'} onClick={() => setAba('correcao')}>
            Correção pedida ({correcao.length})
          </button>
        </div>
        {materias.length > 1 && (
          <div className="field professor-materia">
            <label htmlFor="prof-materia">Matéria</label>
            <select id="prof-materia" value={materia} onChange={(e) => setMateria(e.target.value)}>
              <option value="">Todas</option>
              {materias.map((m) => <option key={m} value={m}>{nomeDisciplina(m as DisciplinaId)}</option>)}
            </select>
          </div>
        )}
      </div>

      {aviso && <p className="alert alert-success" role="status">{aviso}</p>}
      {erro && <p className="alert alert-error" role="alert">{erro}</p>}

      {atual
        ? <CartaoRevisao key={`${atual.id}:${atual.versao}`} item={atual} onDecidir={decidir} />
        : <p className="card muted">{aba === 'pendente' ? 'Nada para revisar aqui. Obrigado!' : 'Nenhum pedido de correção em aberto.'}</p>}
    </div>
  );
}

function CartaoRevisao({ item, onDecidir }: { item: ItemFila; onDecidir: (item: ItemFila, acao: AcaoRevisao, nota?: string) => Promise<void> }) {
  const [modo, setModo] = useState<'ver' | 'corrigir' | 'descartar'>('ver');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(acao: AcaoRevisao, texto?: string) {
    setEnviando(true);
    await onDecidir(item, acao, texto);
    setEnviando(false);
  }

  return (
    <article className="card professor-questao" aria-label={`Questão ${item.id}`}>
      <p className="eyebrow">{nomeDisciplina(item.disciplina)} · {item.assunto}</p>
      <p className="muted professor-origem">{origemTexto(item)} · <code>{item.id}</code></p>

      {item.pedido && (
        <p className="alert alert-info">
          {item.situacao === 'correcao' ? 'Você pediu correção' : 'Corrigida depois do seu pedido'} ({dataCurta(item.pedido.em)}): “{item.pedido.nota}”
        </p>
      )}

      <p className="professor-enunciado">{item.enunciado}</p>
      <ol className="professor-alternativas">
        {item.alternativas.map((alt, i) => (
          <li key={i} className={i === item.correta ? 'is-correta' : undefined}>
            <span className="professor-letra" aria-hidden="true">{LETRAS[i]}</span>
            <span>{alt}</span>
            {i === item.correta && <span className="pill pill-done">Gabarito</span>}
          </li>
        ))}
      </ol>
      <div className="professor-explicacao">
        <h2>Explicação para o aluno</h2>
        <p>{item.explicacao}</p>
      </div>

      {modo === 'ver' ? (
        <div className="professor-acoes">
          <button type="button" className="btn btn-primary" disabled={enviando} onClick={() => void enviar('aprovar')}>Aprovar</button>
          <button type="button" className="btn btn-secondary" disabled={enviando} onClick={() => setModo('corrigir')}>Pedir correção</button>
          {item.origem === 'banco' && (
            <button type="button" className="btn btn-danger" disabled={enviando} onClick={() => setModo('descartar')}>Descartar</button>
          )}
        </div>
      ) : (
        <form
          className="professor-nota"
          onSubmit={(e) => { e.preventDefault(); void enviar(modo, nota); }}
        >
          <div className="field">
            <label htmlFor="prof-nota">{modo === 'corrigir' ? 'O que precisa mudar?' : 'Por que descartar?'}</label>
            <textarea id="prof-nota" className="essay-text" rows={4} maxLength={2000} value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
          <div className="professor-acoes">
            <button type="submit" className="btn btn-primary" disabled={enviando || !nota.trim()}>
              {modo === 'corrigir' ? 'Enviar pedido de correção' : 'Descartar questão'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setModo('ver'); setNota(''); }}>Voltar</button>
          </div>
        </form>
      )}
    </article>
  );
}
