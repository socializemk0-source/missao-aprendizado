// Casa do Tico: o quarto de estudo que o aluno monta. Cada conquista libera um
// item (o servidor decide); aqui o aluno escolhe o item e depois o lugar. Tocar
// num item do quarto deixa mover ou guardar na caixa.

import { useState } from 'react';
import { Link } from 'react-router';
import { Tico } from '../components/Tico';
import { LoadState, useLoad } from '../game/useLoad';
import { ApiError } from '../lib/api';
import { game } from '../lib/game';
import { LUGARES, type Casa as CasaDados, type ItemNaCasa, type LugarTipo } from '../../shared/casa';

const NO_LUGAR: Record<LugarTipo, string> = { parede: 'na parede', chao: 'no chão' };

export function Casa() {
  const loaded = useLoad(game.casa, []);
  const [casa, setCasa] = useState<CasaDados | null>(null);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const dados = casa ?? loaded.data;
  const itens = dados?.itens ?? [];
  const item = itens.find((i) => i.id === escolhido) ?? null;
  const liberados = itens.filter((i) => i.liberado);
  const bloqueados = itens.filter((i) => !i.liberado);

  async function colocar(lugar: string | null) {
    if (!item) return;
    setSalvando(true);
    setErro(null);
    try {
      setCasa(await game.colocarNaCasa(item.id, lugar));
      setEscolhido(null);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível arrumar agora. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Casa do Tico</p>
        <h1 className="page-title">O cantinho de estudo do Tico</h1>
        <p className="muted">Cada conquista libera um item novo. Você escolhe onde ele fica.</p>
      </header>
      <LoadState loaded={loaded}>
        <div className="casa-quarto" role="group" aria-label="Quarto do Tico">
          {(['parede', 'chao'] as const).map((tipo) => (
            <div key={tipo} className={`casa-${tipo}`}>
              {tipo === 'parede' && <span className="casa-janela" aria-hidden="true" />}
              {LUGARES[tipo].map((lugar, n) => {
                const ali = itens.find((i) => i.lugarAtual === lugar);
                if (ali) {
                  return (
                    <button
                      key={lugar} type="button" className={`casa-lugar is-ocupado ${escolhido === ali.id ? 'is-escolhido' : ''}`}
                      aria-label={`${ali.nome}, ${NO_LUGAR[tipo]}`} aria-pressed={escolhido === ali.id}
                      onClick={() => setEscolhido(escolhido === ali.id ? null : ali.id)} disabled={salvando}
                    >
                      <span aria-hidden="true">{ali.emoji}</span>
                    </button>
                  );
                }
                if (item && item.lugar === tipo) {
                  return (
                    <button
                      key={lugar} type="button" className="casa-lugar is-livre" aria-label={`Lugar vazio ${NO_LUGAR[tipo]} ${n + 1}`}
                      onClick={() => void colocar(lugar)} disabled={salvando}
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  );
                }
                return <span key={lugar} className="casa-lugar" aria-hidden="true" />;
              })}
            </div>
          ))}
          <Tico pose="acenando" className="casa-tico" alt="" />
        </div>

        {item && (
          <div className="casa-escolha card" role="status">
            <p>
              <span aria-hidden="true">{item.emoji} </span>
              Escolha um lugar {NO_LUGAR[item.lugar]} para: <strong>{item.nome}</strong>
            </p>
            <div className="casa-escolha-acoes">
              {item.lugarAtual && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => void colocar(null)} disabled={salvando}>Guardar na caixa</button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEscolhido(null)} disabled={salvando}>Cancelar</button>
            </div>
          </div>
        )}
        {erro && <p className="alert alert-error" role="alert">{erro}</p>}

        <h2 className="section-title">Seus itens</h2>
        <ul className="casa-itens" aria-label="Seus itens">
          {liberados.map((i) => <ItemLiberado key={i.id} item={i} escolhido={escolhido === i.id} onEscolher={() => setEscolhido(escolhido === i.id ? null : i.id)} />)}
        </ul>

        {bloqueados.length > 0 && (
          <>
            <h2 className="section-title">Para liberar</h2>
            <ul className="casa-itens" aria-label="Itens para liberar">
              {bloqueados.map((i) => (
                <li key={i.id} className="casa-item is-bloqueado">
                  <span className="casa-item-emoji" aria-hidden="true">{i.emoji}</span>
                  <span className="casa-item-texto">
                    <strong>{i.nome}</strong>
                    <span className="muted">Para liberar: {i.comoLiberar?.descricao ?? 'continue estudando.'}</span>
                  </span>
                  <span className="casa-cadeado" aria-hidden="true">🔒</span>
                </li>
              ))}
            </ul>
            <p className="muted casa-dica">Veja suas <Link to="/conquistas">conquistas</Link> para saber o que falta.</p>
          </>
        )}
      </LoadState>
    </>
  );
}

function ItemLiberado({ item, escolhido, onEscolher }: { item: ItemNaCasa; escolhido: boolean; onEscolher: () => void }) {
  return (
    <li>
      <button type="button" className={`casa-item ${escolhido ? 'is-escolhido' : ''}`} aria-pressed={escolhido} onClick={onEscolher}>
        <span className="casa-item-emoji" aria-hidden="true">{item.emoji}</span>
        <span className="casa-item-texto">
          <strong>{item.nome}</strong>
          <span className="muted">{item.lugarAtual ? 'No quarto' : 'Na caixa'}</span>
        </span>
      </button>
    </li>
  );
}
