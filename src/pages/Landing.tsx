import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { BRAND } from '../app/nav';
import { FREE_FEATURES, PRO_FEATURES, PRO_OPTIONS } from '../app/plans';
import { Icon, type IconName } from '../components/Icon';
import { Tico } from '../components/Tico';
import { DemoQuestion } from './landing/DemoQuestion';
import { LeadForm } from './landing/LeadForm';

const BANCAS = ['Cebraspe', 'FGV', 'FCC', 'Vunesp', 'Cesgranrio'];

const PAINS = [
  { pain: 'Não sei por onde começar', fix: 'A trilha mostra o próximo passo. Você abre o app e já sabe o que estudar hoje.' },
  { pain: 'Estudo, estudo e esqueço', fix: 'Fases curtas, questão logo depois da teoria e revisão dos seus erros na hora certa.' },
  { pain: 'Perco o ritmo em poucos dias', fix: 'Missões diárias, sequência de dias e ranking deixam o estudo com cara de jogo.' },
];

const STEPS = [
  { title: 'Crie sua conta grátis', text: 'Diga qual concurso você quer e em qual banca. Leva menos de um minuto.' },
  { title: 'Avance fase por fase', text: 'Cada fase tem poucas questões, com explicação logo depois de responder.' },
  { title: 'Revise e acompanhe', text: 'Seus erros voltam para revisão e você vê o quanto evoluiu em cada assunto.' },
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'compass', title: 'Trilha guiada', text: 'Capítulos e fases em ordem, do básico ao nível de prova.' },
  { icon: 'book', title: 'Questões no estilo das bancas', text: 'No padrão Cebraspe, FGV, FCC e outras, cada uma com a explicação da resposta.' },
  { icon: 'pen', title: 'Redação com IA', text: 'Nota por critério no padrão da sua banca e os trechos para melhorar.' },
  { icon: 'rotate', title: 'Revisão dos seus erros', text: 'O que você errou volta para revisão até virar acerto.' },
  { icon: 'target', title: 'Missões diárias', text: 'Metas pequenas todo dia e uma sequência de dias para manter o ritmo.' },
  { icon: 'trophy', title: 'Ranking e conquistas', text: 'Compare seu progresso e desbloqueie conquistas enquanto estuda.' },
];

const FAQ = [
  { q: 'É grátis mesmo?', a: 'Sim. O plano grátis não pede cartão e não expira. O PRO libera tudo, sem limites, para quem quiser acelerar.' },
  { q: 'De onde vêm as questões?', a: 'Hoje são questões autorais, escritas pela nossa equipe no estilo das principais bancas, sempre com explicação. Questões de provas oficiais entram identificadas com banca, órgão e ano, conferidas com o gabarito publicado.' },
  { q: 'Serve para o meu concurso?', a: 'Começamos pelas disciplinas que mais caem em concursos: Português, Raciocínio Lógico, Informática, Direito Constitucional e Direito Administrativo. Novos conteúdos entram na trilha com frequência.' },
  { q: 'Como funciona a correção de redação?', a: 'Você escreve no app e a IA avalia pelos critérios da banca escolhida, com nota por critério e trechos para revisar. É uma nota estimada para treino, que não substitui a correção de um professor.' },
  { q: 'O PRO renova sozinho?', a: 'Não. O PRO é um pagamento único (PIX ou cartão) que vale por 30 dias ou por 1 ano. Quando acabar, você escolhe se quer continuar.' },
  { q: 'Funciona no celular?', a: 'Sim. O Aprova Tico funciona direto no navegador, no celular e no computador, e seu progresso fica salvo na sua conta.' },
];

export function Landing() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const [cycle, setCycle] = useState<(typeof PRO_OPTIONS)[number]['id']>('monthly');
  const pro = PRO_OPTIONS.find((o) => o.id === cycle)!;
  const primaryCta = signedIn
    ? <Link to="/jogar" className="btn btn-primary btn-lg">Continuar minha trilha</Link>
    : <Link to="/cadastro" className="btn btn-primary btn-lg">Começar grátis</Link>;

  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="brand">
          <span className="brand-mark"><Icon name="compass" /></span>
          <span>{BRAND.first} {BRAND.second}<span className="brand-accent">.</span></span>
        </Link>
        <nav className="landing-nav" aria-label="Seções da página">
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <div className="landing-actions">
          {signedIn ? (
            <Link to="/jogar" className="btn btn-primary">Continuar estudando</Link>
          ) : (
            <>
              <Link to="/entrar" className="btn btn-secondary">Entrar</Link>
              <Link to="/cadastro" className="btn btn-primary">Criar conta</Link>
            </>
          )}
        </div>
      </header>

      <main>
        {/* 1. Promessa + prova imediata */}
        <section className="lp-section lp-hero">
          <div className="lp-hero-text">
            <p className="eyebrow">Estudo para concursos em forma de aventura</p>
            <h1 className="landing-title">Sua aprovação, uma fase de cada vez.</h1>
            <p className="lp-lead">Questões no estilo das bancas, explicação em cada resposta e uma trilha que mostra exatamente o próximo passo. Com o Tico do seu lado todos os dias.</p>
            <div className="landing-cta">
              {primaryCta}
              {!signedIn && <a href="#experimente" className="btn btn-secondary btn-lg">Testar uma questão</a>}
            </div>
            <p className="lp-trust"><Icon name="star" size={16} /> Grátis para começar · sem cartão de crédito</p>
          </div>
          <Tico pose="acenando" className="tico lp-hero-tico" />
        </section>

        <section className="lp-bancas" aria-label="Bancas">
          <span>Questões das provas de</span>
          <ul>{BANCAS.map((b) => <li key={b}>{b}</li>)}</ul>
        </section>

        {/* 2. Experimentar sem cadastro */}
        <section className="lp-section lp-try" id="experimente" aria-labelledby="try-title">
          <div className="lp-try-text">
            <p className="eyebrow">Sem cadastro</p>
            <h2 id="try-title" className="lp-h2">Responda, confira, entenda.</h2>
            <p className="muted">É assim em cada fase da trilha: poucas questões por vez e a explicação logo depois. Você aprende com o erro na hora, não uma semana depois.</p>
          </div>
          <DemoQuestion />
        </section>

        {/* 3. Dores → solução */}
        <section className="lp-section" aria-labelledby="pains-title">
          <h2 id="pains-title" className="lp-h2 center">Estudar para concurso não precisa ser solitário e confuso</h2>
          <div className="lp-pains">
            {PAINS.map((p) => (
              <article key={p.pain} className="card lp-pain">
                <p className="lp-pain-quote">“{p.pain}”</p>
                <p>{p.fix}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 4. Como funciona (sequência real) */}
        <section className="lp-section lp-steps-wrap" id="como-funciona" aria-labelledby="steps-title">
          <h2 id="steps-title" className="lp-h2 center">Como funciona</h2>
          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="lp-step">
                <span className="lp-step-n" aria-hidden="true">{i + 1}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 5. Recursos */}
        <section className="lp-section" id="recursos" aria-labelledby="features-title">
          <h2 id="features-title" className="lp-h2 center">Tudo o que você precisa num lugar só</h2>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="card feature">
                <span className="feature-icon"><Icon name={f.icon} /></span>
                <h3>{f.title}</h3>
                <p className="muted">{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 6. Planos */}
        <section className="lp-section" id="planos" aria-labelledby="plans-title">
          <h2 id="plans-title" className="lp-h2 center">Comece grátis. Vire PRO quando quiser.</h2>
          <div className="lp-plans">
            <article className="card lp-plan">
              <h3>Grátis</h3>
              <p className="lp-price"><span className="lp-price-cur">R$</span>0</p>
              <p className="muted lp-plan-note">Para sempre, sem cartão.</p>
              <ul className="lp-checks">{FREE_FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link to={signedIn ? '/jogar' : '/cadastro'} className="btn btn-secondary btn-block">{signedIn ? 'Ir para a trilha' : 'Começar grátis'}</Link>
            </article>
            <article className="card lp-plan lp-plan-pro">
              <span className="lp-plan-badge">Recomendado</span>
              <h3>PRO</h3>
              <div className="lp-cycle" role="group" aria-label="Período do PRO">
                {PRO_OPTIONS.map((o) => (
                  <button key={o.id} type="button" aria-pressed={cycle === o.id} onClick={() => setCycle(o.id)}>{o.label}</button>
                ))}
              </div>
              <p className="lp-price"><span className="lp-price-cur">R$</span>{pro.price}<span className="lp-price-per"> {pro.period}</span></p>
              <p className="muted lp-plan-note">{pro.note}</p>
              <ul className="lp-checks">{PRO_FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link to={signedIn ? '/planos' : '/cadastro'} className="btn btn-primary btn-block">Quero o PRO</Link>
            </article>
          </div>
        </section>

        {/* 7. Captura */}
        <section className="lp-section lp-capture" aria-labelledby="capture-title">
          <div>
            <p className="eyebrow">Ainda não quer criar conta?</p>
            <h2 id="capture-title" className="lp-h2">Receba dicas de estudo e as novidades do Tico</h2>
            <p className="muted">Conteúdo curto e prático no seu e-mail. Nada de spam.</p>
          </div>
          <LeadForm />
        </section>

        {/* 8. Dúvidas */}
        <section className="lp-section" id="duvidas" aria-labelledby="faq-title">
          <h2 id="faq-title" className="lp-h2 center">Dúvidas frequentes</h2>
          <div className="lp-faq">
            {FAQ.map((item) => (
              <details key={item.q} className="lp-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 9. Chamada final */}
        <section className="lp-section hero lp-final">
          <div className="hero-text">
            <h2 className="lp-h2">Sua próxima fase começa hoje.</h2>
            <p>Crie sua conta grátis e responda a primeira questão em menos de um minuto.</p>
            <div className="landing-cta">{primaryCta}</div>
          </div>
          <Tico pose="comemorando" />
        </section>
      </main>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} {BRAND.first} {BRAND.second}</span>
        <nav aria-label="Rodapé">
          <a href="#duvidas">Dúvidas</a>
          <Link to="/privacidade">Privacidade</Link>
          {!signedIn && <Link to="/entrar">Entrar</Link>}
        </nav>
      </footer>
    </div>
  );
}
