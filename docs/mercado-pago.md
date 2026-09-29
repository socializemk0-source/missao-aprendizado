# Mercado Pago: como ligar os pagamentos

O código já está pronto. Faltam as credenciais e a configuração no painel do
Mercado Pago e na Vercel. Siga na ordem: primeiro em **teste** (sem dinheiro
de verdade), depois em **produção**.

Como funciona, em uma frase: o aluno clica em comprar, o app registra a
compra e manda o aluno ao Checkout Pro do Mercado Pago (PIX ou cartão). O PRO
só é liberado depois que o **servidor** consulta o pagamento na API do
Mercado Pago. Isso acontece por três caminhos: a volta do checkout, o aviso
automático (webhook) e o botão "Verificar meu pagamento".

## 1. Criar a aplicação no Mercado Pago

1. Entre em <https://www.mercadopago.com.br/developers/panel/app> com a conta
   que vai **receber** o dinheiro.
2. Clique em **Criar aplicação**. Nome: `Aprova Tico`. Tipo de solução:
   **Pagamentos online**. Produto: **Checkout Pro**.
3. Abra a aplicação criada. Nela ficam as **credenciais** (teste e
   produção) e a tela de **Webhooks**.

## 2. Testar sem dinheiro de verdade

1. Na aplicação, abra **Contas de teste** e crie duas contas: um **vendedor**
   e um **comprador**. Anote usuário e senha das duas.
2. Entre no painel de desenvolvedores com a conta **vendedor de teste**, crie
   nela uma aplicação igual à do passo 1 e copie o **Access Token** dela.
3. Na Vercel (**Settings → Environment Variables**), em **Preview**, cadastre:
   - `MERCADOPAGO_ACCESS_TOKEN` = o token copiado
   - `MERCADOPAGO_WEBHOOK_SECRET` = veja o passo 4 abaixo
4. Webhook de teste: na aplicação do vendedor de teste, abra **Webhooks →
   Configurar notificações**. Em URL, coloque o endereço da prévia seguido de
   `/api/pagamentos/webhook`. Marque o evento **Pagamentos** e salve. Copie a
   **assinatura secreta** para `MERCADOPAGO_WEBHOOK_SECRET`.
5. Faça um novo deploy da prévia (as variáveis só valem em deploys novos).
6. Na prévia, entre no app, vá em **Planos** e compre. No checkout, use a
   conta do **comprador de teste** e um dos cartões da página oficial de
   cartões de teste do Mercado Pago. O nome do titular decide o resultado:
   `APRO` aprova, `OTHE` recusa, `CONT` deixa pendente.
7. Confira:
   - aprovado → o app mostra "PRO liberado até…" e o cabeçalho mostra ∞;
   - recusado → "O pagamento não foi aprovado. Nada foi liberado";
   - o botão **Verificar meu pagamento**, em Planos, também encontra a compra;
   - no painel, **Webhooks → Simular notificação** deve responder 200.

## 3. Ligar em produção

1. Na aplicação verdadeira (passo 1), abra **Credenciais de produção** e
   clique em **Ativar credenciais**. O Mercado Pago pede o ramo do negócio e
   o endereço do site: use o domínio oficial do app.
2. Copie o **Access Token de produção** (começa com `APP_USR-`).
3. Em **Webhooks → Configurar notificações**, aba **Modo produção**: URL
   `https://SEU_DOMINIO/api/pagamentos/webhook`, evento **Pagamentos**. Salve e
   copie a **assinatura secreta**.
4. Na Vercel, em **Production**, cadastre:
   - `MERCADOPAGO_ACCESS_TOKEN` = token de produção
   - `MERCADOPAGO_WEBHOOK_SECRET` = assinatura secreta de produção
   - `APP_BASE_URL` = `https://SEU_DOMINIO` (sem barra no fim). É para onde o
     aluno volta depois de pagar e para onde vão os avisos.
5. Faça um novo deploy de produção.
6. Teste real: compre o passe de 30 dias com o seu próprio PIX, confira se o
   PRO foi liberado e depois devolva o dinheiro pelo painel do Mercado Pago
   (**Atividade → o pagamento → Devolver**). O aviso de estorno tira os 30
   dias automaticamente.

## Quando algo dá errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Planos mostra "Os pagamentos ainda estão sendo configurados" | `MERCADOPAGO_ACCESS_TOKEN` ausente no ambiente | Cadastrar na Vercel e fazer novo deploy |
| Clicar em comprar mostra "Não foi possível falar com o Mercado Pago" | Token inválido ou de outro ambiente | Conferir o token (teste na prévia, produção na produção) |
| Pagou, mas o PRO só aparece depois de "Verificar meu pagamento" | O aviso automático não está chegando | Conferir a URL do webhook e a assinatura secreta. Nos logs da Vercel, `[webhook] assinatura inválida` indica segredo errado |
| O aluno voltou do checkout para o endereço errado | `APP_BASE_URL` ausente ou errado | Corrigir e fazer novo deploy |

## O que o app garante

- O PRO nunca é liberado pela tela: só depois de o servidor consultar o
  pagamento no Mercado Pago com o token secreto.
- O mesmo pagamento nunca soma dias duas vezes.
- Pagamento de outra pessoa não libera nada.
- O valor pago e a moeda são conferidos.
- Estorno e contestação tiram os dias.
- Boleto fica desligado, porque leva dias para compensar.
- Sem renovação automática: o passe acaba e o aluno decide se compra de novo.
