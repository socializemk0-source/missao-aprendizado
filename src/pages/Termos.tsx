// Termos de uso. Texto em linguagem simples. Antes de vender em escala, peça
// a revisão de um advogado (ver docs/seguranca.md).

import { Link } from 'react-router';
import { BRAND, COMPANY, CONTACT_EMAIL } from '../app/nav';
import { LegalShell } from './LegalShell';

export function Termos() {
  const nome = `${BRAND.first} ${BRAND.second}`;
  return (
    <LegalShell title="Termos de uso" updated="05/10/2026">
      <p>Ao criar sua conta ou usar o {nome}, você concorda com estes termos. Veja também como cuidamos dos seus dados na nossa <Link to="/privacidade">política de privacidade</Link>. Se tiver dúvida, escreva para {CONTACT_EMAIL}.</p>

      <h2>O que é o Aprova Tico</h2>
      <p>Um app para estudar para concursos públicos: trilha de questões, revisão, simulados, jogos, plano de estudos e correção de redação. O {nome} não tem ligação com nenhuma banca nem órgão público e não garante aprovação.</p>
      <p>O {nome} é oferecido por {COMPANY.name}, CNPJ {COMPANY.cnpj}.</p>

      <h2>Sua conta</h2>
      <ul>
        <li>A conta é pessoal: não compartilhe seu login e sua senha.</li>
        <li>Para criar conta, você precisa ter pelo menos 16 anos. Se tiver menos de 18, use o app com a autorização de um responsável.</li>
        <li>Mantenha seu e-mail atualizado: é por ele que você recupera a senha.</li>
      </ul>

      <h2>Plano grátis e PRO</h2>
      <ul>
        <li>O plano grátis tem limites (vidas na trilha, capítulos, simulados e correções de redação), que podem mudar com aviso no app.</li>
        <li>O PRO é pago uma vez, por PIX ou cartão pelo Mercado Pago, e vale por 30 dias ou por 1 ano, conforme a opção escolhida. É <strong>sem renovação automática</strong>: nada é cobrado de novo sem você pedir. O preço atual fica na página Planos.</li>
        <li>Comprar outro passe com o PRO ativo soma os dias ao que você já tem. O PRO é liberado assim que o Mercado Pago confirma o pagamento.</li>
        <li>Para proteger o serviço, alguns recursos do PRO têm limite de uso justo (por exemplo, até 20 correções de redação a cada 24 horas).</li>
      </ul>

      <h2>Desistência e reembolso</h2>
      <p>Pelo Código de Defesa do Consumidor (art. 49), você pode desistir da compra do PRO em até <strong>7 dias</strong> depois do pagamento e receber todo o valor de volta. Peça pelo {CONTACT_EMAIL}, com o e-mail da conta. A devolução é feita pelo mesmo meio de pagamento, e os dias de PRO daquela compra saem da sua conta.</p>
      <p>Depois desse prazo não devolvemos dias não usados. Se um problema nosso impedir você de usar o que pagou, fale com a gente que resolvemos.</p>

      <h2>Correção de redação</h2>
      <p>A correção de redação é feita por inteligência artificial e serve para treino. Ela pode errar e não substitui a correção da banca nem de um professor. O texto que você envia é usado só para corrigir e fica no seu histórico até você excluí-lo junto com a conta. Não escreva dados pessoais (CPF, endereço, telefone) no texto.</p>

      <h2>O que não é permitido</h2>
      <ul>
        <li>Usar robôs, scripts ou qualquer automação para acessar o app ou responder questões.</li>
        <li>Tentar invadir, sobrecarregar ou burlar os limites, os pagamentos e a segurança do app.</li>
        <li>Copiar, vender ou publicar em outro lugar as questões, explicações e demais conteúdos do {nome}.</li>
        <li>Usar nomes ofensivos ou de outra pessoa no perfil (seu primeiro nome aparece no ranking).</li>
      </ul>
      <p>Se isso acontecer, podemos suspender ou encerrar a conta.</p>

      <h2>Conteúdo e direitos</h2>
      <p>As questões são escritas pela nossa equipe no estilo das bancas e não são cópias das provas oficiais, salvo quando a questão indicar a banca, o ano, o órgão e o cargo. Questões, explicações, trilha, jogos, textos, marca e o mascote Tico são do {nome} e protegidos por direito autoral. Você pode usá-los para estudar. Os textos que você escreve (como suas redações) continuam seus.</p>

      <h2>Excluir a conta</h2>
      <p>Você pode excluir a conta quando quiser, em <strong>Perfil → Excluir minha conta</strong>. Seus dados de estudo e seu login são apagados. O que acontece com cada dado está na <Link to="/privacidade">Política de privacidade</Link>.</p>

      <h2>Disponibilidade</h2>
      <p>Fazemos o possível para o app funcionar sempre e para as questões estarem corretas, mas pode haver falhas, pausas para manutenção e erros. Se achar um erro numa questão, avise pelo {CONTACT_EMAIL}.</p>

      <h2>Mudanças nestes termos</h2>
      <p>Se mudarmos estes termos, avisamos no app antes de a mudança valer. Continuar usando depois do aviso significa concordar com a nova versão.</p>

      <h2>Lei aplicável</h2>
      <p>Valem as leis do Brasil, inclusive o Código de Defesa do Consumidor e a Lei Geral de Proteção de Dados. Eventuais disputas podem ser levadas ao foro do seu domicílio.</p>

      <h2>Contato</h2>
      <p>Dúvidas, pedidos de reembolso ou de exclusão da conta: {CONTACT_EMAIL}.</p>
    </LegalShell>
  );
}
