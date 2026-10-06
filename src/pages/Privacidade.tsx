import { Link } from 'react-router';
import { COMPANY, CONTACT_EMAIL } from '../app/nav';
import { reabrirAvisoCookies } from '../lib/consentimento';
import { LegalShell } from './LegalShell';

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
        <li><strong>De onde você veio:</strong> se você chegou por um link nosso (anúncio, Instagram, e-mail), guardamos a etiqueta desse link (campanha e anúncio) e o código de clique da plataforma, para saber quais divulgações trazem alunos. Essa origem fica no seu aparelho por até 30 dias e, se você criar a conta, é guardada junto com ela.</li>
        <li><strong>Uso do site:</strong> registramos, no nosso próprio banco, etapas como abrir uma página, responder a questão de demonstração, criar a conta, montar o plano, concluir a primeira fase, abrir os planos e clicar para pagar, com a data e a origem acima. Serve para medir o que funciona; não vai para ninguém sem o seu aceite.</li>
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
        <li><strong>Resend:</strong> envia os e-mails de confirmação de cadastro e de troca de senha.</li>
        <li><strong>Meta (Facebook e Instagram), só se você aceitar os cookies de anúncio:</strong> veja abaixo.</li>
      </ul>
      <p>No ranking, os outros alunos veem só o seu primeiro nome e o seu XP.</p>

      <h2>Cookies e anúncios</h2>
      <p>Os cookies do login e das suas preferências (tema, som) são necessários para o site funcionar e ficam sempre ligados.</p>
      <p>Os <strong>cookies de anúncio</strong> só são ligados se você clicar em <strong>Aceitar</strong> no aviso de cookies. Com eles, o pixel da <strong>Meta</strong> (Facebook e Instagram) recebe que você abriu uma página, respondeu a questão de demonstração, deixou o e-mail, criou a conta, montou o plano, concluiu a primeira fase, abriu os planos ou clicou para pagar. Serve para sabermos quais anúncios trazem alunos e para a Meta mostrar nossos anúncios a pessoas parecidas. Não enviamos seu nome, e-mail ou telefone nesses avisos.</p>
      <p>Se você recusar ou não responder, nada disso é enviado à Meta, e o site funciona igual. Hoje usamos só a Meta. Se um dia usarmos também o TikTok ou o Google para anúncios, eles entram nesta lista antes e seguem a mesma regra: só com o seu aceite.</p>
      <p>Você pode mudar de ideia quando quiser: aqui mesmo, em <button type="button" className="link-button" onClick={reabrirAvisoCookies}>Mudar minha escolha de cookies</button>, ou em <strong>Perfil → Cookies de anúncio</strong>. Ao recusar, paramos de enviar a partir daquele momento.</p>

      <h2>Por quanto tempo guardamos</h2>
      <p>Enquanto sua conta existir. Ao excluir a conta, apagamos seus dados de estudo, sua escolha de cookies e o seu login; os registros de uso do site deixam de ter qualquer ligação com você. Os registros de pagamento ficam guardados pelo prazo que a lei exige (obrigações fiscais e do Código de Defesa do Consumidor), sem nome nem e-mail.</p>
      <p>Uma vez por semana fazemos cópias de segurança criptografadas do banco, guardadas por até 90 dias. Depois que você exclui a conta, seus dados somem dessas cópias nesse prazo.</p>

      <h2>Seus direitos</h2>
      <p>Você pode ver e corrigir seus dados no Perfil e excluir a conta a qualquer momento em <strong>Perfil → Excluir minha conta</strong>. Também pode pedir acesso, correção ou exclusão, e sair da lista de e-mails (pelo link no próprio e-mail), escrevendo para {CONTACT_EMAIL}.</p>
      <p>Veja também os <Link to="/termos">Termos de uso</Link>.</p>
    </LegalShell>
  );
}
