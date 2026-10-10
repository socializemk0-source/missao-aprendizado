// Questões da série "Desafio do Tico" (vídeo, Stories e carrosséis).
// Texto igual ao de content/questoes/*.ts; só questões autorais da trilha.
(() => {
  // ---------- questões da série (texto igual ao de content/questoes/*.ts) ----------
  const syl = (parts, tonica) => `<span class="syl">${parts.map((p, i) => `<span class="${i === tonica ? 't' : ''}">${p}</span>`).join('')}</span>`;
  window.QUESTOES_DESAFIO = {
    'pt-acent-4': {
      materia: 'PORTUGUÊS · ACENTUAÇÃO',
      enunciado: 'Qual das palavras abaixo é proparoxítona?',
      alternativas: ['ínterim', 'rubrica', 'recorde', 'gratuito'], correta: 0,
      resposta: 'ínterim',
      passos: [
        `${syl(['ÍN', 'te', 'rim'], 0)} <span class="tag">proparoxítona: tem acento</span>`,
        `${syl(['ru', 'BRI', 'ca'], 1)} <span class="tag no">não é "rúbrica"</span>`,
        `${syl(['re', 'COR', 'de'], 1)} <span class="tag no">não é "récorde"</span>`,
        `${syl(['gra', 'TUI', 'to'], 1)} <span class="tag no">não é "gratúito"</span>`,
      ],
    },
    'rlm-porc-2': {
      materia: 'RACIOCÍNIO LÓGICO · PORCENTAGEM',
      enunciado: 'Um salário de R$ 2.000,00 teve um aumento de 10% e, depois, outro aumento de 10%. O salário final é:',
      alternativas: ['R$ 2.400,00', 'R$ 2.420,00', 'R$ 2.200,00', 'R$ 2.410,00'], correta: 1,
      resposta: 'R$ 2.420,00',
      passos: [
        '<span class="big">2.000 × 1,10 = <span class="hl">2.200</span></span>',
        '<span class="big">2.200 × 1,10 = <span class="hl">2.420</span></span>',
        '<span class="tag">aumentos sucessivos se multiplicam</span>',
        '<span class="tag no">não é 20% de uma vez</span>',
      ],
    },
    'adm-ato-3': {
      materia: 'DIREITO ADMINISTRATIVO · ATOS',
      enunciado: 'A retirada de um ato válido que deixou de ser conveniente e oportuno chama-se:',
      alternativas: ['anulação', 'revogação', 'cassação', 'caducidade'], correta: 1,
      resposta: 'revogação',
      passos: [
        '<span>Ato <b class="hl">válido</b>, retirado por conveniência e oportunidade</span>',
        '<span class="tag">= revogação (só pela própria Administração)</span>',
        '<span>Ato <b style="color:#b91c1c">ilegal</b></span>',
        '<span class="tag no">= anulação</span>',
      ],
    },
    'rlm-eq-1': {
      materia: 'RACIOCÍNIO LÓGICO · EQUIVALÊNCIAS',
      enunciado: '"Se estudo, então passo" é equivalente a:',
      alternativas: ['Se passo, então estudo.', 'Se não estudo, então não passo.', 'Se não passo, então não estudo.', 'Estudo e passo.'], correta: 2,
      resposta: 'Se não passo, então não estudo.',
      passos: [
        '<span class="big">p → q ≡ <span class="hl">~q → ~p</span></span>',
        '<span class="tag">contrapositiva: inverte a ordem</span>',
        '<span class="tag">e nega as duas partes</span>',
        '<span class="tag no">"se não estudo, não passo" não é equivalente</span>',
      ],
    },
    'pt-crase-1': {
      materia: 'PORTUGUÊS · CRASE',
      enunciado: 'Assinale a frase em que o acento grave (crase) está empregado corretamente.',
      alternativas: ['Fui à Brasília ontem.', 'Entreguei o documento à ela.', 'Refiro-me à diretora do setor.', 'Começou à chover.'], correta: 2,
      resposta: 'Refiro-me à diretora',
      passos: [
        '<span>"referir-se <b class="hl">a</b>" + "<b class="hl">a</b> diretora" = <b class="hl">à</b></span>',
        '<span class="tag no">a Brasília: vou a, volto de</span>',
        '<span class="tag no">a ela: pronome pessoal</span>',
        '<span class="tag no">a chover: antes de verbo</span>',
      ],
    },
    'rlm-porc-3': {
      materia: 'RACIOCÍNIO LÓGICO · PORCENTAGEM',
      enunciado: 'Um aumento de 20% seguido de um desconto de 20% faz o preço voltar ao valor inicial.',
      alternativas: ['Certo', 'Errado'], correta: 1,
      resposta: 'Errado',
      passos: [
        '<span class="big">1,20 × 0,80 = <span class="hl">0,96</span></span>',
        '<span class="tag">o preço final fica 4% menor</span>',
        '<span>Ex.: R$ 100 → R$ 120 → <b class="hl">R$ 96</b></span>',
        '<span class="tag no">porcentagens sucessivas não se anulam</span>',
      ],
    },
    'inf-plan-1': {
      materia: 'INFORMÁTICA · PLANILHAS',
      enunciado: 'No Excel em português, qual fórmula soma os valores das células A1 até A10?',
      alternativas: ['=SOMA(A1:A10)', '=SOMA(A1;A10)', 'SOMA(A1-A10)', '=A1+A10'], correta: 0,
      resposta: '=SOMA(A1:A10)',
      passos: [
        '<span class="big">A1<span class="hl">:</span>A10 = de A1 até A10</span>',
        '<span class="big">A1<span class="hl">;</span>A10 = só A1 e A10</span>',
        '<span class="tag">dois-pontos: intervalo</span>',
        '<span class="tag no">ponto e vírgula: células separadas</span>',
      ],
    },
    'const-rem-1': {
      materia: 'DIREITO CONSTITUCIONAL · REMÉDIOS',
      enunciado: 'O remédio constitucional que protege o direito de locomoção (ir e vir) é o:',
      alternativas: ['mandado de segurança', 'habeas data', 'habeas corpus', 'ação popular'], correta: 2,
      resposta: 'habeas corpus',
      passos: [
        '<span><b class="hl">Habeas corpus</b>: liberdade de ir e vir</span>',
        '<span class="tag">art. 5º, LXVIII da Constituição</span>',
        '<span>contra ilegalidade ou abuso de poder</span>',
        '<span class="tag no">habeas data: informações sobre você</span>',
      ],
    },
  };

})();
