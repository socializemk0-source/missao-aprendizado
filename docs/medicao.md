# Medição de marketing (fase A)

Plano e motivos: `Trafego/04-medicao-e-utm.md` e `Trafego/especificacao-tecnica.md`
(marketing). Aqui fica como o código faz e como conferir.

## Regra principal

- **Sem "Aceitar" no aviso de cookies, nada vai para a Meta.** Nem o script do
  pixel carrega. Recusar depois (Perfil → Cookies de anúncio, ou
  `/privacidade` → "Mudar minha escolha de cookies") revoga na hora.
- O **registro próprio** (`v2.eventos_marketing`) recebe os eventos com ou sem
  aceite, marcando o consentimento de cada um. É dado nosso, não vai para
  plataforma nenhuma.
- Falha na medição nunca impede cadastro, estudo, inscrição ou pagamento.
- Nenhum dado do aluno (nome, e-mail, telefone) vai no pixel, nem com hash.
  Correspondência avançada, eventos automáticos e PageView automático ficam
  desligados também no código (`autoConfig` falso, `disablePushState`).

## Eventos

| # | Evento | Quem registra | Pixel |
|---|---|---|---|
| 1 | PageView | tela, a cada página (`src/lib/medicao.ts`) | navegador |
| 2 | DemoQuestionAnswered (`acertou`: sim/nao) | questão de demonstração | navegador (personalizado) |
| 3 | Lead | `/api/leads` grava; a tela manda o mesmo `event_id` | navegador |
| 4 | CompleteRegistration | servidor, no 1º acesso de conta nova (`/api/eventos`) | navegador, com o `event_id` do servidor |
| 5 | OnboardingCompleted | servidor, ao salvar `/comecar` | navegador, com o `event_id` do servidor (personalizado) |
| 6 | FirstPhaseCompleted | servidor, na 1ª fase concluída | navegador, com o `event_id` do servidor (personalizado) |
| 7 | ViewContent (`content_name`: planos) | tela `/planos` | navegador |
| 8 | InitiateCheckout (plano, valor, BRL) | botão de pagar em `/planos`; valor vem do servidor | navegador |
| 9 | Purchase | fase B (webhook do Mercado Pago, `event_id` = `purchase_<id do pagamento>`) | — |

Eventos 4, 5 e 6 acontecem no servidor. Com aceite, ficam "pendentes" e voltam
na resposta do próximo `POST /api/eventos` (a cada troca de página); o pixel
os dispara com o mesmo `event_id`. Cada um vale uma vez por aluno.

Coluna `envio` (situação no pixel): `navegador`, `pendente`,
`entregue_ao_navegador` ou `sem_consentimento`. A fase B acrescenta a da API
de Conversões.

## Origem (UTM)

- Na 1ª visita com `utm_*`, `fbclid`, `gclid` ou `ttclid`, o navegador guarda a
  origem por **30 dias** (`ORIGEM_VALIDADE_DIAS` em `shared/medicao.ts`).
  Visitas seguintes nesse prazo não trocam. Depois de 30 dias, uma visita nova
  com etiqueta vale.
- No 1º acesso de conta nova, o servidor grava a origem no aluno
  (`v2.marketing_usuarios.origem`) e nunca a troca. Todos os eventos do aluno
  levam essa origem.
- Login com Google e volta do Mercado Pago: o navegador é o mesmo, a origem
  continua guardada.
- **iPhone, app instalado:** o app da tela inicial não enxerga o que o Safari
  guardou (cookies e armazenamento são separados). Nosso convite para instalar
  só aparece com login (Perfil e Trilha): quem instala por ele já tem a origem
  gravada na conta. Perde a origem quem instala pelo menu "Compartilhar →
  Adicionar à Tela de Início" do Safari **antes** de criar a conta, ou quem
  clica no anúncio dentro do Instagram e cria a conta em outro navegador
  (limite do aparelho; acontece pouco).

## Configuração (Vercel → Settings → Environment Variables)

| Variável | Onde | Valor |
|---|---|---|
| `META_PIXEL_ID` | Production | id do pixel do Aprova Tico (público, só números) |
| `META_CAPI_TOKEN` | Production | já cadastrado; só a fase B usa |
| `META_TEST_EVENT_CODE` | Production, só durante a conferência | código da aba "Testar eventos" |

Banco: rodar no SQL Editor do Supabase as migrações
`0015_v2_consentimento.sql` e `0016_v2_eventos_marketing.sql` (idempotentes).

## Conferência no "Testar eventos" da Meta

1. Gerenciador de Eventos → conjunto de dados do Aprova Tico → **Testar
   eventos** → aba do navegador → endereço
   `https://www.aprovatico.com.br/?utm_source=meta&utm_medium=paid_social&utm_campaign=teste_interno_202610&utm_content=c000-teste`
   → **Abrir site**.
2. No aviso, **Recusar** e navegar: nada deve aparecer na Meta.
3. Perfil (ou `/privacidade`) → aceitar. Depois, na ordem: página inicial
   (PageView), responder a questão de demonstração (DemoQuestionAnswered),
   deixar o e-mail (Lead), criar conta e entrar (CompleteRegistration),
   `/comecar` (OnboardingCompleted), concluir a 1ª fase (FirstPhaseCompleted),
   `/planos` (ViewContent), clicar em pagar (InitiateCheckout).
4. Cada evento aparece uma vez, com `event_id`. A origem aparece no registro
   próprio:

```sql
-- últimos eventos (o que a Meta deveria ter recebido = consentimento true)
select criado_em, evento, user_id, consentimento, envio, valor, origem->>'utm_content' as criativo, teste
from v2.eventos_marketing order by criado_em desc limit 50;

-- origem gravada no cadastro
select user_id, origem, origem_em, consentimento, consentimento_em
from v2.marketing_usuarios order by updated_at desc limit 20;
```

Depois: apagar `META_TEST_EVENT_CODE` e, se quiser, os eventos de teste
(`delete from v2.eventos_marketing where teste;`).

## Painel semanal (exemplo)

```sql
select origem->>'utm_content' as criativo,
       count(*) filter (where evento = 'PageView') as visitas,
       count(*) filter (where evento = 'DemoQuestionAnswered') as demo,
       count(*) filter (where evento = 'CompleteRegistration') as cadastros,
       count(*) filter (where evento = 'FirstPhaseCompleted') as primeira_fase,
       count(*) filter (where evento = 'ViewContent') as viu_planos,
       count(*) filter (where evento = 'InitiateCheckout') as clicou_pagar
from v2.eventos_marketing
where not teste and criado_em > now() - interval '7 days'
group by 1 order by visitas desc;
```
