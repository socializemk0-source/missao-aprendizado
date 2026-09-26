// Planos: situação do PRO, compra do passe (Checkout Pro do Mercado Pago)
// e confirmação na volta. Quem decide se o PRO vale é sempre o servidor.

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { FREE_FEATURES, PRO_FEATURES, PRO_OPTIONS } from '../app/plans';
import { Tico } from '../components/Tico';
import { useProgress } from '../game/ProgressProvider';
import { LoadState, useLoad } from '../game/useLoad';
import { formatDate } from '../lib/essay';
import { brl, leave, payApi } from '../lib/payments';

type Banner = { kind: 'ok' | 'wait' | 'error'; text: string };

const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

export function Planos() {
  const loaded = useLoad(payApi.status, []);
  const { refresh } = useProgress();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [going, setGoing] = useState<string | null>(null);
  const confirmed = useRef(false);

  // Volta do Mercado Pago: /planos?payment_id=...&status=...
  const paymentId = params.get('payment_id') ?? params.get('collection_id');
  const returnStatus = params.get('status') ?? params.get('collection_status');
  // Voltar do checkout pelo botão "voltar" restaura a página da memória
  // do navegador: destrava os botões.
  useEffect(() => {
    const onShow = () => setGoing(null);
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  useEffect(() => {
    if (confirmed.current || (!paymentId && !returnStatus)) return;
    confirmed.current = true;
    setGoing(null);
    navigate('/planos', { replace: true });
    if (!paymentId || paymentId === 'null') {
      setBanner({ kind: 'error', text: 'O pagamento não foi concluído. Nada foi cobrado; você pode tentar de novo.' });
      return;
    }
    setBanner({ kind: 'wait', text: 'Conferindo seu pagamento…' });
    payApi.confirm(paymentId).then((r) => {
      if (r.resultado === 'granted' || r.resultado === 'already') {
        setBanner({ kind: 'ok', text: `PRO liberado${r.proAte ? ` até ${formatDate(r.proAte)}` : ''}! Bons estudos.` });
      } else if (r.resultado === 'pending') {
        setBanner({ kind: 'wait', text: 'Pagamento em processamento. No PIX costuma levar poucos segundos; o PRO é liberado sozinho assim que ele for aprovado.' });
      } else {
        setBanner({ kind: 'error', text: 'O pagamento não foi aprovado. Nada foi liberado; você pode tentar de novo.' });
      }
      loaded.reload();
      void refresh();
    }).catch((err: unknown) => setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Não foi possível conferir o pagamento.' }));
  }, [paymentId, returnStatus, navigate, loaded, refresh]);

  async function buy(cycle: 'monthly' | 'annual') {
    setGoing(cycle);
    setBanner(null);
    try {
      leave.to((await payApi.checkout(cycle)).url);
    } catch (err) {
      setBanner({ kind: 'error', text: err instanceof Error ? err.message : 'Não foi possível abrir o pagamento.' });
      setGoing(null);
    }
  }

  const s = loaded.data;
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Planos</p>
          {s?.plano === 'pro' && s.proAte ? (
            <>
              <h1 className="page-title">Você é PRO até {formatDate(s.proAte)}</h1>
              <p>Faltam {daysLeft(s.proAte)} dias. Se comprar de novo, os dias se somam ao que já tem.</p>
            </>
          ) : (
            <>
              <h1 className="page-title">Estude sem limites com o PRO</h1>
              <p>Pagamento único no PIX ou cartão. Não renova sozinho: quando acabar, você decide se continua.</p>
            </>
          )}
        </div>
        <Tico pose={s?.plano === 'pro' ? 'comemorando' : 'estrela'} />
      </section>

      {banner && <p className={`alert ${banner.kind === 'ok' ? 'alert-success' : banner.kind === 'error' ? 'alert-error' : 'alert-info'}`} role={banner.kind === 'error' ? 'alert' : 'status'}>{banner.text}</p>}

      <LoadState loaded={loaded}>
        {s && (
          <>
            {!s.enabled && <p className="alert alert-info" role="status">Os pagamentos ainda estão sendo configurados. Volte em breve!</p>}
            <div className="plans-grid">
              <article className={`card lp-plan ${s.plano === 'free' ? 'is-current' : ''}`}>
                <h2>Grátis</h2>
                <p className="lp-price"><span className="lp-price-cur">R$</span>0</p>
                <p className="muted lp-plan-note">Para sempre, sem cartão.</p>
                <ul className="lp-checks">{FREE_FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
                {s.plano === 'free' ? <span className="pill">Seu plano atual</span> : <Link to="/jogar" className="btn btn-secondary btn-block">Ir para a trilha</Link>}
              </article>
              {PRO_OPTIONS.map((o) => {
                const server = s.opcoes.find((x) => x.id === o.id);
                return (
                  <article key={o.id} className={`card lp-plan lp-plan-pro ${o.id === 'annual' ? 'is-best' : ''}`}>
                    {o.id === 'annual' && <span className="lp-plan-badge">Mais econômico</span>}
                    <h2>PRO · {o.label}</h2>
                    <p className="lp-price"><span className="lp-price-cur">R$</span>{o.price}<span className="lp-price-per"> {o.period}</span></p>
                    <p className="muted lp-plan-note">{o.note}</p>
                    <ul className="lp-checks">{PRO_FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
                    <button type="button" className="btn btn-primary btn-block" disabled={!s.enabled || going !== null} onClick={() => void buy(o.id)}>
                      {going === o.id ? 'Abrindo o pagamento…' : `${s.plano === 'pro' ? 'Somar' : 'Comprar'} ${o.label} — ${server ? brl(server.valor) : `R$ ${o.price}`}`}
                    </button>
                  </article>
                );
              })}
            </div>
            <p className="muted plans-note">Pagamento processado pelo Mercado Pago. O Aprova Tico não vê nem guarda os dados do seu cartão.</p>

            {s.pagamentos.length > 0 && (
              <section aria-labelledby="hist-pag">
                <h2 id="hist-pag" className="section-title">Seus pagamentos</h2>
                <ul className="list-cards">
                  {s.pagamentos.map((p) => (
                    <li key={p.paymentId} className="card mission">
                      <div className="mission-main">
                        <strong>PRO {p.cycle === 'annual' ? '1 ano' : '30 dias'} · {brl(p.amount)}</strong>
                        <span className="muted">{formatDate(p.createdAt, true)} · pagamento nº {p.paymentId}</span>
                      </div>
                      <span className={`pill ${p.status === 'approved' ? 'pill-done' : ''}`}>{p.status === 'approved' ? 'Aprovado' : 'Estornado'}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </LoadState>
    </>
  );
}
