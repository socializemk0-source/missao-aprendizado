import { Link } from 'react-router';
import { BRAND, COMPANY, CONTACT_EMAIL } from '../app/nav';
import { Icon } from '../components/Icon';

const UPDATED = '04/10/2026';

export function Termos() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="brand">
          <span className="brand-mark"><Icon name="compass" /></span>
          <span>{BRAND.first} {BRAND.second}<span className="brand-accent">.</span></span>
        </Link>
      </header>
      <main className="legal">
        <h1 className="page-title">Termos de uso</h1>
        <p className="muted">Atualizados em {UPDATED}.</p>
        <p>Ao criar uma conta ou usar o {BRAND.first} {BRAND.second}, você concorda com estes termos. Veja também como cuidamos dos seus dados na nossa <Link to="/privacidade">política de privacidade</Link>.</p>

        <h2>O que é o Aprova Tico</h2>
        <p>Um app de estudo para concursos públicos, com questões, trilha de fases, simulados e correção de redação. Ele ajuda você a estudar, mas não garante aprovação em nenhum concurso. Não temos ligação com bancas, órgãos públicos ou governo.</p>
        <p>O {BRAND.first} {BRAND.second} é oferecido por {COMPANY.name}, CNPJ {COMPANY.cnpj}.</p>

        <h2>Sua conta</h2>
        <ul>
          <li>A conta é pessoal: não empreste nem divida com outras pessoas.</li>
          <li>Use um e-mail seu e guarde bem a sua senha.</li>
          <li>Podemos suspender a conta usada para fraude, para burlar limites ou pagamentos, ou para copiar o conteúdo em massa.</li>
          <li>Você pode excluir a conta quando quiser, em <strong>Perfil → Excluir minha conta</strong>. Seus dados de estudo e seu login são apagados (veja a <Link to="/privacidade">política de privacidade</Link>).</li>
        </ul>

        <h2>Plano grátis e PRO</h2>
        <ul>
          <li>O plano grátis tem limites por dia, que aparecem no próprio app e podem mudar.</li>
          <li>O PRO é um passe de 30 dias ou de 1 ano, pago uma vez por PIX ou cartão pelo Mercado Pago. O preço atual fica na página Planos.</li>
          <li>O PRO é <strong>sem renovação automática</strong>: nada é cobrado de novo sem você pedir. Quando o passe acaba, você volta ao plano grátis sem perder seu progresso e decide se compra de novo.</li>
          <li>Comprar outro passe com o PRO ativo soma os dias ao que você já tem.</li>
          <li>O PRO é liberado assim que o Mercado Pago confirma o pagamento.</li>
        </ul>

        <h2>Desistência e reembolso</h2>
        <p>Você pode desistir da compra em até <strong>7 dias</strong> depois do pagamento e receber todo o valor de volta, como garante o Código de Defesa do Consumidor (art. 49). É só escrever para {CONTACT_EMAIL}. A devolução é feita pelo mesmo meio de pagamento, e os dias de PRO daquela compra saem da sua conta.</p>
        <p>Depois desse prazo não devolvemos dias não usados. Se um problema nosso impedir você de usar o que pagou, fale com a gente que resolvemos.</p>

        <h2>Conteúdo e direitos</h2>
        <p>As questões são escritas pela nossa equipe ou vêm de provas oficiais, sempre com banca, ano, órgão e cargo indicados. As explicações, a trilha, os textos, as ilustrações e o Tico são nossos.</p>
        <p>O conteúdo é para o seu estudo pessoal. Não é permitido copiar, publicar ou revender as questões e explicações, nem usar programas para baixá-las. Achou um erro numa questão? Avise a gente.</p>

        <h2>Correção de redação</h2>
        <p>A correção é feita por inteligência artificial. A nota é uma estimativa para você treinar, não a nota que a banca daria. Não escreva dados pessoais (CPF, endereço, telefone) no texto da redação.</p>

        <h2>Mudanças nestes termos</h2>
        <p>Podemos atualizar estes termos. A data no topo mostra a última mudança, e avisamos no app ou por e-mail quando a mudança for importante.</p>

        <h2>Contato</h2>
        <p>Dúvidas, pedidos de reembolso ou de exclusão da conta: {CONTACT_EMAIL}.</p>

        <p><Link to="/">Voltar para a página inicial</Link></p>
      </main>
    </div>
  );
}
