// Onboarding: 5 perguntas rápidas para montar o plano de estudos. Também
// serve para ajustar o plano depois (vem preenchido). Quem confere e grava
// é o servidor; aqui só ajudamos a preencher certo.

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { DisciplinaId } from '../../content/types';
import { BANCAS_ALVO, MINUTOS_DIA, MINUTOS_NOME, NIVEIS_ALUNO, type BancaAlvo, type NivelAluno } from '../../shared/estudo';
import { Tico } from '../components/Tico';
import { MATERIAS } from '../games/info';
import { ApiError } from '../lib/api';
import { game } from '../lib/game';

const SUGESTOES = [
  'INSS — Técnico do Seguro Social', 'Tribunais — Técnico Judiciário', 'Tribunais — Analista Judiciário',
  'Banco do Brasil — Escriturário', 'Caixa — Técnico Bancário', 'Polícia Federal — Agente',
  'Prefeitura — Assistente Administrativo', 'Receita Federal — Analista Tributário',
];

const PASSOS = ['Sua prova', 'Data', 'Tempo', 'Nível', 'Matérias'];

const hojeLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

export function Comecar() {
  const navigate = useNavigate();
  const [passo, setPasso] = useState(0);
  const [editando, setEditando] = useState(false);
  const [prova, setProva] = useState('');
  const [banca, setBanca] = useState<BancaAlvo | ''>('');
  const [semData, setSemData] = useState(false);
  const [dataProva, setDataProva] = useState('');
  const [minutos, setMinutos] = useState<number | null>(null);
  const [nivel, setNivel] = useState<NivelAluno | null>(null);
  const [disciplinas, setDisciplinas] = useState<DisciplinaId[]>(MATERIAS.map((m) => m.id));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Quem já tem plano chega aqui para ajustar: começa preenchido.
  useEffect(() => {
    let ativo = true;
    game.plano().then((p) => {
      if (!ativo || !p.configurado) return;
      const { perfil } = p;
      setEditando(true);
      setProva(perfil.prova);
      setBanca(perfil.banca ?? '');
      setSemData(!perfil.dataProva);
      setDataProva(perfil.dataProva ?? '');
      setMinutos(perfil.minutosDia);
      setNivel(perfil.nivel);
      setDisciplinas(perfil.disciplinas);
    }).catch(() => {});
    return () => { ativo = false; };
  }, []);

  function faltando(): string | null {
    if (passo === 0 && prova.trim().length < 2) return 'Conte qual concurso você vai prestar.';
    if (passo === 1 && !semData && !dataProva) return 'Escolha a data da prova ou marque que ainda não tem data.';
    if (passo === 1 && !semData && dataProva < hojeLocal()) return 'A data da prova já passou.';
    if (passo === 2 && minutos === null) return 'Escolha quanto tempo por dia você tem.';
    if (passo === 3 && nivel === null) return 'Escolha a opção que mais parece com você.';
    if (passo === 4 && disciplinas.length === 0) return 'Escolha pelo menos uma matéria.';
    return null;
  }

  async function avancar(e: FormEvent) {
    e.preventDefault();
    const falta = faltando();
    setErro(falta);
    if (falta) return;
    if (passo < PASSOS.length - 1) {
      setPasso(passo + 1);
      return;
    }
    setSalvando(true);
    try {
      await game.salvarPlano({
        prova: prova.trim(), banca: banca || null, dataProva: semData ? null : dataProva,
        minutosDia: minutos!, nivel: nivel!, disciplinas,
      });
      navigate('/hoje', { replace: true });
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar agora. Tente de novo.');
      setSalvando(false);
    }
  }

  const toggle = (id: DisciplinaId) => setDisciplinas((ds) => (ds.includes(id) ? ds.filter((d) => d !== id) : [...ds, id]));

  return (
    <section className="onboarding">
      <header className="onboarding-head">
        <Tico pose={passo === PASSOS.length - 1 ? 'estrela' : 'apontando'} className="onboarding-tico" />
        <div>
          <p className="eyebrow">{editando ? 'Ajustar meu plano' : 'Vamos montar seu plano'} · Passo {passo + 1} de {PASSOS.length}</p>
          <div className="onboarding-steps" aria-hidden="true">
            {PASSOS.map((p, i) => <span key={p} className={i <= passo ? 'is-on' : ''} />)}
          </div>
        </div>
      </header>

      <form className="card onboarding-card" onSubmit={(e) => void avancar(e)} noValidate>
        {passo === 0 && (
          <>
            <h1 className="page-title">Qual concurso você vai prestar?</h1>
            <div className="field">
              <label htmlFor="ob-prova">Concurso ou cargo</label>
              <input id="ob-prova" list="ob-sugestoes" maxLength={80} value={prova} onChange={(e) => setProva(e.target.value)} placeholder="Ex.: INSS — Técnico do Seguro Social" autoComplete="off" />
              <datalist id="ob-sugestoes">{SUGESTOES.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <fieldset className="chip-group">
              <legend>Banca</legend>
              {[...BANCAS_ALVO, ''].map((b) => (
                <label key={b || 'nao-sei'} className={`chip ${banca === b ? 'is-on' : ''}`}>
                  <input type="radio" name="banca" className="visually-hidden" checked={banca === b} onChange={() => setBanca(b as BancaAlvo | '')} />
                  {b || 'Ainda não sei'}
                </label>
              ))}
            </fieldset>
          </>
        )}

        {passo === 1 && (
          <>
            <h1 className="page-title">Quando é a prova?</h1>
            <div className="field">
              <label htmlFor="ob-data">Data da prova</label>
              <input id="ob-data" type="date" min={hojeLocal()} value={dataProva} disabled={semData} onChange={(e) => setDataProva(e.target.value)} />
            </div>
            <label className="check">
              <input type="checkbox" checked={semData} onChange={(e) => setSemData(e.target.checked)} />
              Ainda não tem data (edital não saiu)
            </label>
          </>
        )}

        {passo === 2 && (
          <fieldset className="choice-list">
            <legend><h1 className="page-title">Quanto tempo por dia você tem para estudar?</h1></legend>
            {MINUTOS_DIA.map((m) => (
              <label key={m} className={`choice ${minutos === m ? 'is-on' : ''}`}>
                <input type="radio" name="minutos" checked={minutos === m} onChange={() => setMinutos(m)} />
                <strong>{MINUTOS_NOME[m]}</strong>
              </label>
            ))}
          </fieldset>
        )}

        {passo === 3 && (
          <fieldset className="choice-list">
            <legend><h1 className="page-title">Como você está nessas matérias?</h1></legend>
            {NIVEIS_ALUNO.map((n) => (
              <label key={n.id} className={`choice ${nivel === n.id ? 'is-on' : ''}`}>
                <input type="radio" name="nivel" checked={nivel === n.id} onChange={() => setNivel(n.id)} />
                <span><strong>{n.nome}</strong><span className="muted">{n.descricao}</span></span>
              </label>
            ))}
          </fieldset>
        )}

        {passo === 4 && (
          <fieldset className="choice-list">
            <legend><h1 className="page-title">Quais matérias caem na sua prova?</h1></legend>
            {MATERIAS.map((m) => (
              <label key={m.id} className={`choice ${disciplinas.includes(m.id) ? 'is-on' : ''}`}>
                <input type="checkbox" checked={disciplinas.includes(m.id)} onChange={() => toggle(m.id)} />
                <strong>{m.nome}</strong>
              </label>
            ))}
          </fieldset>
        )}

        {erro && <p className="alert alert-error" role="alert">{erro}</p>}

        <div className="onboarding-actions">
          {passo > 0
            ? <button type="button" className="btn btn-secondary" onClick={() => { setErro(null); setPasso(passo - 1); }}>Voltar</button>
            : editando ? <Link to="/hoje" className="btn btn-secondary">Cancelar</Link> : <span />}
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {passo < PASSOS.length - 1 ? 'Continuar' : salvando ? 'Montando…' : editando ? 'Salvar meu plano' : 'Montar meu plano'}
          </button>
        </div>
      </form>
    </section>
  );
}
