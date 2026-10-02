// Termos de uso. Texto em linguagem simples. Antes do lançamento, peça a
// revisão de um advogado (ver docs/seguranca.md).

import { Link } from 'react-router';
import { BRAND, CONTACT_EMAIL } from '../app/nav';
import { LegalShell } from './LegalShell';

export function Termos() {
  const nome = `${BRAND.first} ${BRAND.second}`;
  const contact = CONTACT_EMAIL || 'o e-mail de contato (em definição)';
  return (
    <LegalShell title="Termos de uso" updated="02/10/2026">
      <p>Ao criar sua conta ou usar o {nome}, você concorda com estes termos. Leia com calma; se tiver dúvida, escreva para {contact}.</p>

      <h2>1. O que é o {nome}</h2>
      <p>Um app para estudar para concursos públicos: trilha de questões, revisão, simulados, jogos, plano de estudos e correção de redação. As questões são escritas pela nossa equipe no estilo das bancas e não são cópias das provas oficiais, salvo quando a questão indicar a banca, o ano, o órgão e o cargo. O {nome} não tem ligação com nenhuma banca nem órgão público e não garante aprovação.</p>

      <h2>2. Sua conta</h2>
      <ul>
        <li>A conta é pessoal: não compartilhe seu login e sua senha.</li>
        <li>Para criar conta, você precisa ter pelo menos 16 anos. Se tiver menos de 18, use o app com a autorização de um responsável.</li>
        <li>Mantenha seu e-mail atualizado: é por ele que você recupera a senha.</li>
      </ul>

      <h2>3. Plano Grátis e plano PRO</h2>
      <ul>
        <li>O Plano Grátis tem limites (vidas na trilha, capítulos, simulados e correções de redação), que podem mudar com aviso no app.</li>
        <li>O PRO é pago uma vez, pelo Mercado Pago, e vale por 30 dias ou por 1 ano, conforme a opção escolhida. É <strong>sem renovação automática</strong>: nada é cobrado de novo sem você pedir.</li>
        <li>Para proteger o serviço, alguns recursos do PRO têm limite de uso justo (por exemplo, até 20 correções de redação a cada 24 horas).</li>
      </ul>

      <h2>4. Arrependimento e reembolso</h2>
      <p>Pelo Código de Defesa do Consumidor (art. 49), você pode desistir da compra do PRO em até <strong>7 dias</strong> depois do pagamento e receber o valor de volta. Peça pelo {contact}, com o e-mail da conta. O PRO é desligado quando o reembolso é feito.</p>

      <h2>5. Correção de redação por inteligência artificial</h2>
      <p>A correção de redação é feita por inteligência artificial e serve para treino. Ela pode errar e não substitui a correção da banca nem de um professor. O texto que você envia é usado só para corrigir e fica no seu histórico até você excluí-lo junto com a conta.</p>

      <h2>6. O que não é permitido</h2>
      <ul>
        <li>Usar robôs, scripts ou qualquer automação para acessar o app ou responder questões.</li>
        <li>Tentar invadir, sobrecarregar ou burlar os limites e a segurança do app.</li>
        <li>Copiar, vender ou publicar em outro lugar as questões, explicações e demais conteúdos do {nome}.</li>
        <li>Usar nomes ofensivos ou de outra pessoa no perfil (seu primeiro nome aparece no ranking).</li>
      </ul>
      <p>Se isso acontecer, podemos suspender ou encerrar a conta.</p>

      <h2>7. Conteúdo</h2>
      <p>Questões, explicações, trilha, jogos, textos, marca e o mascote Tico são do {nome} e protegidos por direito autoral. Você pode usá-los para estudar. Os textos que você escreve (como suas redações) continuam seus.</p>

      <h2>8. Excluir a conta</h2>
      <p>Você pode excluir a conta quando quiser, em <strong>Perfil → Excluir minha conta</strong>. Seus dados de estudo e seu login são apagados. O que acontece com cada dado está na <Link to="/privacidade">Política de privacidade</Link>.</p>

      <h2>9. Disponibilidade</h2>
      <p>Fazemos o possível para o app funcionar sempre e para as questões estarem corretas, mas pode haver falhas, pausas para manutenção e erros. Se achar um erro numa questão, avise pelo {contact}.</p>

      <h2>10. Mudanças nestes termos</h2>
      <p>Se mudarmos estes termos, avisamos no app antes de a mudança valer. Continuar usando depois do aviso significa concordar com a nova versão.</p>

      <h2>11. Lei aplicável</h2>
      <p>Valem as leis do Brasil, inclusive o Código de Defesa do Consumidor e a Lei Geral de Proteção de Dados. Eventuais disputas podem ser levadas ao foro do seu domicílio.</p>
    </LegalShell>
  );
}
