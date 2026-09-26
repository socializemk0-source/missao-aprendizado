import type { Questao } from '../types.js';

const CE = ['Certo', 'Errado'];
const autoral = { tipo: 'autoral' } as const;
const estiloCebraspe = { tipo: 'autoral', estilo: 'Cebraspe' } as const;

export const INFORMATICA: Questao[] = [
  // ---- Conceitos básicos ----
  {
    id: 'inf-base-1', disciplina: 'informatica', assunto: 'Hardware',
    enunciado: 'A memória RAM caracteriza-se por ser:',
    alternativas: ['permanente, guardando os dados com o computador desligado', 'volátil, perdendo o conteúdo quando o computador é desligado', 'somente de leitura', 'um tipo de armazenamento em nuvem'],
    correta: 1,
    explicacao: 'A RAM é a memória de trabalho: rápida e volátil. Ao desligar o computador, o que estava nela se perde. Para guardar, usa-se o armazenamento (SSD, HD, pendrive).',
    fonte: autoral,
  },
  {
    id: 'inf-base-2', disciplina: 'informatica', assunto: 'Hardware e software',
    enunciado: 'O processador (CPU) é um exemplo de software.',
    alternativas: CE, correta: 1,
    explicacao: 'Errado. O processador é hardware (parte física). Software são os programas, como o sistema operacional e os aplicativos.',
    fonte: estiloCebraspe,
  },
  {
    id: 'inf-base-3', disciplina: 'informatica', assunto: 'Arquivos',
    enunciado: 'Qual extensão indica, normalmente, um arquivo de planilha do Microsoft Excel?',
    alternativas: ['.docx', '.xlsx', '.pptx', '.pdf'],
    correta: 1,
    explicacao: '.xlsx é planilha do Excel; .docx é documento do Word; .pptx é apresentação do PowerPoint; .pdf é documento portátil.',
    fonte: autoral,
  },
  {
    id: 'inf-base-4', disciplina: 'informatica', assunto: 'Hardware',
    enunciado: 'Um pendrive é, principalmente, um dispositivo de:',
    alternativas: ['processamento', 'armazenamento de dados não volátil', 'memória RAM adicional', 'saída de vídeo'],
    correta: 1,
    explicacao: 'O pendrive usa memória flash: guarda os arquivos mesmo sem energia. É armazenamento secundário, não memória RAM.',
    fonte: autoral,
  },
  // ---- Segurança da informação ----
  {
    id: 'inf-seg-1', disciplina: 'informatica', assunto: 'Segurança da informação',
    enunciado: 'Uma mensagem falsa que imita um banco para convencer a pessoa a digitar a senha é chamada de:',
    alternativas: ['spam', 'phishing', 'backup', 'firewall'],
    correta: 1,
    explicacao: 'Phishing ("pescaria") é o golpe que se passa por uma instituição confiável para roubar dados. Spam é mensagem em massa não solicitada.',
    fonte: autoral,
  },
  {
    id: 'inf-seg-2', disciplina: 'informatica', assunto: 'Segurança da informação',
    enunciado: 'Fazer cópias de segurança (backup) regularmente ajuda a recuperar arquivos após um ataque de ransomware.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo. O ransomware sequestra (criptografa) os arquivos. Com um backup atualizado e guardado separado, dá para restaurá-los sem pagar resgate.',
    fonte: estiloCebraspe,
  },
  {
    id: 'inf-seg-3', disciplina: 'informatica', assunto: 'Segurança da informação',
    enunciado: 'Qual das senhas abaixo é a mais segura?',
    alternativas: ['123456', 'Seu nome e sua data de nascimento', 'Uma frase longa com letras, números e símbolos, como "Tico#Estuda2026!"', 'senha'],
    correta: 2,
    explicacao: 'Senhas longas e variadas (maiúsculas, minúsculas, números e símbolos) são mais difíceis de adivinhar. Dados pessoais e sequências são as primeiras tentativas de um invasor.',
    fonte: autoral,
  },
  {
    id: 'inf-seg-4', disciplina: 'informatica', assunto: 'Segurança da informação',
    enunciado: 'O firewall tem como função principal controlar o tráfego de rede, permitindo ou bloqueando conexões conforme regras definidas.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo. O firewall filtra as conexões de rede. Ele não substitui o antivírus, que procura programas maliciosos nos arquivos.',
    fonte: estiloCebraspe,
  },
  // ---- Internet e e-mail ----
  {
    id: 'inf-net-1', disciplina: 'informatica', assunto: 'Internet',
    enunciado: 'O cadeado e o "https" na barra de endereço do navegador indicam que:',
    alternativas: ['o site é do governo', 'a conexão entre o navegador e o site é criptografada', 'o site não tem vírus', 'o site é gratuito'],
    correta: 1,
    explicacao: 'HTTPS significa que os dados trafegam criptografados entre você e o site. Isso não garante que o site seja confiável, só que a conexão é protegida.',
    fonte: autoral,
  },
  {
    id: 'inf-net-2', disciplina: 'informatica', assunto: 'E-mail',
    enunciado: 'Ao enviar um e-mail, os destinatários colocados em CCO (cópia oculta) não são vistos pelos demais destinatários.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo. Quem está em CCO recebe a mensagem, mas o endereço não aparece para os outros destinatários.',
    fonte: estiloCebraspe,
  },
  {
    id: 'inf-net-3', disciplina: 'informatica', assunto: 'Internet',
    enunciado: 'No endereço "https://www.gov.br/inss", o trecho "gov.br" corresponde:',
    alternativas: ['ao protocolo', 'ao domínio', 'ao caminho da página', 'ao navegador'],
    correta: 1,
    explicacao: '"https" é o protocolo, "www.gov.br" identifica o domínio (o site) e "/inss" é o caminho dentro do site.',
    fonte: autoral,
  },
  {
    id: 'inf-net-4', disciplina: 'informatica', assunto: 'Navegadores',
    enunciado: 'A navegação anônima (privativa) do navegador:',
    alternativas: ['deixa o usuário invisível para o provedor de internet', 'não guarda o histórico e os cookies no computador depois que a janela é fechada', 'impede qualquer vírus', 'acelera a conexão'],
    correta: 1,
    explicacao: 'O modo anônimo só evita que o histórico, os cookies e os dados de formulário fiquem salvos no aparelho. O provedor e os sites continuam vendo a conexão.',
    fonte: autoral,
  },
  // ---- Planilhas ----
  {
    id: 'inf-plan-1', disciplina: 'informatica', assunto: 'Planilhas',
    enunciado: 'No Excel em português, qual fórmula soma os valores das células A1 até A10?',
    alternativas: ['=SOMA(A1:A10)', '=SOMA(A1;A10)', 'SOMA(A1-A10)', '=A1+A10'],
    correta: 0,
    explicacao: 'Os dois-pontos indicam intervalo ("de A1 até A10"). Com ponto e vírgula, =SOMA(A1;A10) soma só as células A1 e A10.',
    fonte: autoral,
  },
  {
    id: 'inf-plan-2', disciplina: 'informatica', assunto: 'Planilhas',
    enunciado: 'Em uma planilha, a referência $A$1 permanece fixa quando a fórmula é copiada para outras células.',
    alternativas: CE, correta: 0,
    explicacao: 'Certo. O cifrão "trava" a coluna e a linha: é uma referência absoluta.',
    fonte: estiloCebraspe,
  },
  {
    id: 'inf-plan-3', disciplina: 'informatica', assunto: 'Planilhas',
    enunciado: 'Com B1 = 2, B2 = 4, B3 = 6 e B4 = 8, a fórmula =MÉDIA(B1:B4) retorna:',
    alternativas: ['20', '5', '4', '6'],
    correta: 1,
    explicacao: 'Média = soma ÷ quantidade = (2 + 4 + 6 + 8) ÷ 4 = 20 ÷ 4 = 5.',
    fonte: autoral,
  },
  {
    id: 'inf-plan-4', disciplina: 'informatica', assunto: 'Planilhas',
    enunciado: 'Qual fórmula mostra "Aprovado" se C2 for maior ou igual a 7 e "Reprovado" caso contrário?',
    alternativas: ['=SE(C2>=7;"Aprovado";"Reprovado")', '=SE(C2>=7;"Reprovado";"Aprovado")', '=CONT.SE(C2;"Aprovado")', '=SOMA(C2>=7)'],
    correta: 0,
    explicacao: 'A função SE tem três partes: =SE(teste; valor se verdadeiro; valor se falso).',
    fonte: autoral,
  },
];
