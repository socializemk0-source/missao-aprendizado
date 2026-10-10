# E-mail do domínio aprovatico.com.br: DMARC, SPF, DKIM e marca

Conferência automática: `node scripts/email-dns.mjs` (no seu computador) ou
GitHub → *Actions* → **E-mail — DNS** → *Run workflow*. Roda sozinha toda
segunda. Sai com erro se o DMARC, o SPF, o DKIM do Resend ou o MX estiverem
errados; mostra em que etapa do DMARC estamos.

## Quem envia e-mail com o nosso domínio

| Fonte | O que envia | Como se autentica | Conferir |
|---|---|---|---|
| **Resend** (SMTP do Supabase Auth) | Confirmação de cadastro e troca de senha | DKIM `resend._domainkey.aprovatico.com.br` (alinhado ao domínio) e SPF/MX no subdomínio `send.aprovatico.com.br` (o Return-Path do Resend) | Resend → *Domains* → `aprovatico.com.br` **Verified**; Supabase → *Authentication → Emails → SMTP Settings*: host `smtp.resend.com`, remetente `@aprovatico.com.br` |
| **ImprovMX** | Só **recebe** e repassa `contato@` (e `report@`, abaixo) | MX do domínio | Só envia se as respostas do `contato@` saírem pelo SMTP do ImprovMX (plano pago): aí precisa do DKIM dele (abaixo) |
| Sua caixa pessoal ("Enviar como" `contato@`) | Respostas a alunos | Depende de por onde sai: SMTP do ImprovMX (DKIM do ImprovMX) ou do Gmail (aí o SPF precisa de `include:_spf.google.com` e o Gmail não assina como `aprovatico.com.br`) | Responda um e-mail de teste e veja o cabeçalho `Authentication-Results`: `dkim=pass header.d=aprovatico.com.br` |
| Mercado Pago | Comprovantes de pagamento | Domínio **do Mercado Pago**, não o nosso | — |

O app (Vercel) não envia e-mail próprio. Antes de ligar qualquer ferramenta
nova (newsletter, CRM, e-mail de cobrança), ela entra nesta tabela, com DKIM
no nosso domínio, **antes** do primeiro envio — com DMARC em `reject`, e-mail
sem DKIM alinhado vai para o lixo.

## A. DMARC — cronograma

Registro TXT em `_dmarc.aprovatico.com.br`. Antes da etapa 1: no ImprovMX,
crie o apelido **`report@aprovatico.com.br`** → sua caixa (os relatórios
chegam como `.xml.gz`, um por provedor por dia; um filtro para uma pasta ajuda).

| Etapa | Data | Valor do TXT |
|---|---|---|
| Hoje | — | `v=DMARC1; p=none` |
| 1 | 08/10/2026 | `v=DMARC1; p=quarantine; pct=25; rua=mailto:report@aprovatico.com.br; adkim=r; aspf=r` |
| 2 | 22/10/2026 (2 semanas) | `v=DMARC1; p=quarantine; pct=100; rua=mailto:report@aprovatico.com.br; adkim=r; aspf=r` |
| 3 | 05/11/2026 (2 semanas) | `v=DMARC1; p=reject; rua=mailto:report@aprovatico.com.br; adkim=r; aspf=r` |

**Só avance de etapa se**, nos relatórios das duas semanas, todo envio legítimo
(Resend, e o ImprovMX ou o Gmail se você responde por eles) aparece com
`dkim=pass` alinhado ou `spf=pass` alinhado. Uma fonte legítima falhando:
arrume (DKIM daquela ferramenta) e espere mais uma semana antes de subir.
Fontes desconhecidas falhando = alguém tentando se passar pelo domínio: é
exatamente o que o DMARC vai barrar.

Observações: o `pct` ainda é respeitado por Google, Microsoft e Yahoo. Sem
`sp=`, os subdomínios herdam o `p`. Não use `ruf=` (relatório por mensagem:
traz conteúdo de e-mail, e quase ninguém envia).

## B. SPF e DKIM

**SPF** (TXT em `aprovatico.com.br`), hoje: `v=spf1 include:spf.improvmx.com ~all`.

- O Resend **não** entra aqui: ele usa o subdomínio `send.aprovatico.com.br`
  com o SPF dele. Não crie um segundo `v=spf1` na raiz (dois registros = SPF
  inteiro falha).
- Se você responde pelo Gmail ("Enviar como" usando o SMTP do Gmail):
  `v=spf1 include:spf.improvmx.com include:_spf.google.com ~all`.
- Trocar `~all` por `-all` **depois** da etapa 2 do DMARC, quando os
  relatórios mostrarem que não há fonte legítima fora da lista. Com DMARC em
  `reject` e DKIM em todas as fontes, o `-all` quase não muda nada (e pode
  derrubar e-mail repassado por terceiros antes de o DKIM ser olhado) — o
  ganho de verdade é o DMARC.

**DKIM**

- **Resend**: obrigatório. Resend → *Domains* → `aprovatico.com.br` mostra os
  registros (`resend._domainkey` TXT e, em `send`, MX + TXT do SPF); o status
  precisa estar **Verified**. O conferidor falha sem ele.
- **ImprovMX**: DKIM só existe para e-mail **enviado** pelo SMTP do ImprovMX.
  Se você usa: ImprovMX → domínio → *DNS settings* mostra dois CNAME
  (`dkimprovmx1._domainkey` e `dkimprovmx2._domainkey`); os dois verdes.
  Se não usa o SMTP do ImprovMX para responder, não precisa — e a resposta
  sai autenticada pelo que você usa (ver tabela acima).

## C. BIMI e S/MIME

- **S/MIME**: não recomendo. É certificado por caixa de e-mail, quase nenhum
  aluno confere a assinatura, e o DKIM já garante que o e-mail saiu de nós e
  não foi alterado. O app não tem envio transacional próprio (só o Resend, via
  Supabase).
- **BIMI** (logo do Tico ao lado do e-mail no Gmail/Apple Mail): só depois da
  etapa 3 (`p=reject`, ou `quarantine` em 100%). Precisa do logo em SVG Tiny
  PS e, no Gmail, de um certificado **VMC** (pago, exige marca registrada no
  INPI) ou **CMC** (pago, sem marca registrada). Registro:
  `default._bimi.aprovatico.com.br` TXT `v=BIMI1; l=https://www.aprovatico.com.br/bimi/tico.svg; a=<url do certificado>`.
  Avaliar quando a marca "Aprova Tico" estiver registrada.

## D. Domínios oficiais e parecidos

**Oficiais** (os únicos que usamos — vale publicar isso na página de perguntas e
na Política de Privacidade):

- Site e e-mail: **aprovatico.com.br** (`www.aprovatico.com.br`).
- Suporte: **contato@aprovatico.com.br** (único endereço de atendimento).
- Cobrança: **não existe e-mail de cobrança**. O pagamento é só dentro do app,
  pelo Checkout do Mercado Pago; boleto está desligado. Nunca enviamos boleto,
  PIX ou link de pagamento por e-mail, WhatsApp ou SMS.

**Domínios parecidos para registrar** (defesa contra golpe com a marca),
por ordem de risco:

1. `aprovatico.com` · `aprova-tico.com.br` · `aprovatico.net.br`
2. erros de digitação: `aprovattico.com.br`, `aprovaticco.com.br`,
   `aprovatico.com.br` com "i" trocado (`aprovatlco.com.br`), `aprovatico.app`

Em cada domínio registrado e sem uso, publique registros que impedem e-mail com
ele: MX nulo `0 .`, SPF `v=spf1 -all` e DMARC `v=DMARC1; p=reject`.
Redirecione o site (se tiver) para `https://www.aprovatico.com.br`.
Para vigiar registros novos parecidos: a ferramenta gratuita `dnstwist`
(`dnstwist --registered aprovatico.com.br`) uma vez por mês.
