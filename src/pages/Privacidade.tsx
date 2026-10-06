import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { COMPANY, CONTACT_EMAIL } from '../app/nav';
import { aoMudarConsentimento, consentimentoEfetivo, definirConsentimento } from '../lib/consentimento';
import { LegalShell } from './LegalShell';

function EscolhaCookies() {
  const [estado, setEstado] = useState(consentimentoEfetivo());
  useEffect(() => aoMudarConsentimento(setEstado), []);
  const texto = estado === 'aceito' ? 'Você aceitou os cookies de medição.' : estado === 'recusado' ? 'Você recusou os cookies de medição.' : 'Você ainda não escolheu.';
  return (
    <p data-no-track>
      <span role="status">{texto}</span>{' '}
      <button type="button" className="btn btn-secondary" onClick={() => definirConsentimento(false)} disabled={estado === 'recusado'}>Recusar</button>{' '}
      <button type="button" className="btn btn-secondary" onClick={() => definirConsentimento(true)} disabled={estado === 'aceito'}>Aceitar</button>
    </p>
  );
}

export function Privacidade() {
  return (
    <LegalShell title="Política de privacidade" updated="06/10/2026">
      <p>Quem cuida dos seus dados (o controlador, pela LGPD) é {COMPANY.name}, CNPJ {COMPANY.cnpj}.</p>

      <h2>Quais dados guardamos</h2>
      <ul>
        <li><strong>Conta:</strong> nome, e-mail e, se você preencher, concurso, banca e cidade.</li>
        <li><strong>Plano de estudos:</strong> o concurso que você vai prestar, a banca, a data da prova, o tempo por dia, seu nível e as matérias.</li>
        <li><strong>Estudo:</strong> suas respostas, progresso, XP, missões, revisões, simulados, rodadas dos jogos e redações enviadas.</li>
        <li><strong>Pagamentos:</strong> o plano comprado, o valor, a data e o número do pagamento no Mercado Pago. Não recebemos dados de cartão.</li>
        <li><strong>Lista de e-mails:</strong> nome e e-mail de quem pede para receber nossas dicas, com a data da autorização.</li>
        <li><strong>No seu aparelho:</strong> preferências de aparência e som e o rascunho da redação ficam só no navegador, não no nosso servidor.</li>
      </ul>

      <h2>Para que usamos</h2>
      <p>Para você entrar na sua conta, salvar seu progresso em qualquer aparelho, montar seu plano de estudos, corrigir suas redações, liberar o plano PRO e, se você autorizou, mandar dicas e novidades por e-mail. Também usamos o número de pedidos por minuto, por conta e por endereço de internet, para barrar robôs e abusos. Não vendemos seus dados.</p>

      <h2>Com quem compartilhamos</h2>
      <ul>
        <li><strong>Supabase:</strong> login e banco de dados.</li>
        <li><strong>Vercel:</strong> hospedagem do site.</li>
        <li><strong>OpenAI:</strong> recebe só o texto da redação que você pede para corrigir.</li>
        <li><strong>Mercado Pago:</strong> processa os pagamentos do plano PRO.</li>
        <li><strong>Cloudflare (Turnstile):</strong> confere, no login e no cadastro, que quem está entrando não é um robô.</li>
        <li><strong>GitHub:</strong> guarda as cópias de segurança do banco, criptografadas (só nós temos a senha).</li>
        <li><strong>Meta (Facebook e Instagram):</strong> o pixel da Meta mede os nossos anúncios (páginas visitadas, cliques nos botões, até onde você rolou a página, cadastro e compra). Só funciona se você aceitar os cookies. Não enviamos seu nome, e-mail nem suas respostas.</li>
        <li><strong>Resend:</strong> envia os e-mails de confirmação de cadastro e de troca de senha.</li>
      </ul>
      <p>No ranking, os outros alunos veem só o seu primeiro nome e o seu XP.</p>

      <h2 id="cookies">Cookies e medição</h2>
      <p>Só usamos cookies de medição e de anúncios se você aceitar. Se recusar, nada é carregado nem enviado à Meta. Se aceitar, guardamos no seu aparelho de onde você veio (por exemplo, o anúncio que você clicou) por até 30 dias e enviamos à Meta as páginas e ações do site descritas acima, sem nome, e-mail ou respostas. Ao recusar, apagamos esses dados do seu aparelho. Você muda a escolha aqui, quando quiser:</p>
      <EscolhaCookies />

      <h2>Por quanto tempo guardamos</h2>
      <p>Enquanto sua conta existir. Ao excluir a conta, apagamos seus dados de estudo e o seu login. Os registros de pagamento ficam guardados pelo prazo que a lei exige (obrigações fiscais e do Código de Defesa do Consumidor), sem nome nem e-mail.</p>
      <p>Uma vez por semana fazemos cópias de segurança criptografadas do banco, guardadas por até 90 dias. Depois que você exclui a conta, seus dados somem dessas cópias nesse prazo.</p>

      <h2>Seus direitos</h2>
      <p>Você pode ver e corrigir seus dados no Perfil e excluir a conta a qualquer momento em <strong>Perfil → Excluir minha conta</strong>. Também pode pedir acesso, correção ou exclusão, e sair da lista de e-mails (pelo link no próprio e-mail), escrevendo para {CONTACT_EMAIL}.</p>
      <p>Veja também os <Link to="/termos">Termos de uso</Link>.</p>
    </LegalShell>
  );
}
