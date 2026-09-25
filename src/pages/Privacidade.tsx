import { Link } from 'react-router';
import { BRAND, CONTACT_EMAIL } from '../app/nav';
import { Icon } from '../components/Icon';

const UPDATED = '25/09/2026';

export function Privacidade() {
  const contact = CONTACT_EMAIL || 'o e-mail de contato (em definição)';
  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="brand">
          <span className="brand-mark"><Icon name="compass" /></span>
          <span>{BRAND.first} {BRAND.second}<span className="brand-accent">.</span></span>
        </Link>
      </header>
      <main className="legal">
        <h1 className="page-title">Política de privacidade</h1>
        <p className="muted">Atualizada em {UPDATED}.</p>

        <h2>Quais dados guardamos</h2>
        <ul>
          <li><strong>Conta:</strong> nome, e-mail e, se você preencher, concurso, banca e cidade.</li>
          <li><strong>Estudo:</strong> suas respostas, progresso, XP, missões e redações enviadas.</li>
          <li><strong>Lista de e-mails:</strong> nome e e-mail de quem pede para receber nossas dicas, com a data da autorização.</li>
        </ul>

        <h2>Para que usamos</h2>
        <p>Para você entrar na sua conta, salvar seu progresso em qualquer aparelho, montar sua trilha, corrigir suas redações e, se você autorizou, mandar dicas e novidades por e-mail. Não vendemos seus dados.</p>

        <h2>Com quem compartilhamos</h2>
        <ul>
          <li><strong>Supabase:</strong> login e banco de dados.</li>
          <li><strong>Vercel:</strong> hospedagem do site.</li>
          <li><strong>OpenAI:</strong> recebe só o texto da redação que você pede para corrigir.</li>
          <li><strong>Mercado Pago:</strong> processa pagamentos do plano PRO. Não guardamos dados de cartão.</li>
        </ul>

        <h2>Seus direitos</h2>
        <p>Você pode pedir acesso, correção ou exclusão dos seus dados, e sair da lista de e-mails a qualquer momento, pelo link no próprio e-mail ou escrevendo para {contact}.</p>

        <p><Link to="/">Voltar para a página inicial</Link></p>
      </main>
    </div>
  );
}
