-- Missão Aprendizado V2 — medição (fase A): primeira origem do aluno (UTM e
-- código de clique) e registro próprio de eventos de marketing.
-- Idempotente (pode rodar mais de uma vez).
-- Só o servidor usa (RLS ligado, sem políticas: a chave pública não lê nada).

CREATE SCHEMA IF NOT EXISTS v2;

-- Primeira origem, gravada no cadastro (nunca trocada depois).
ALTER TABLE v2.marketing_usuarios ADD COLUMN IF NOT EXISTS origem jsonb;       -- utm_*, fbclid, gclid, ttclid, pagina, em
ALTER TABLE v2.marketing_usuarios ADD COLUMN IF NOT EXISTS origem_em timestamptz;

-- Um evento por linha: a fonte de verdade interna, para o painel semanal e
-- para conferir contra o que as plataformas contam.
CREATE TABLE IF NOT EXISTS v2.eventos_marketing (
  id            bigserial PRIMARY KEY,
  user_id       text,                                    -- null = visitante sem conta
  evento        text NOT NULL CHECK (char_length(evento) <= 40),
  event_id      text NOT NULL UNIQUE CHECK (char_length(event_id) <= 80), -- o mesmo no pixel e na API de Conversões
  criado_em     timestamptz NOT NULL DEFAULT now(),
  valor         numeric(10, 2),
  moeda         text CHECK (moeda IS NULL OR moeda = 'BRL'),
  dados         jsonb,                                   -- ex.: {"acertou": "sim"}, {"plano": "monthly"}
  origem        jsonb,                                   -- utm e códigos de clique
  consentimento boolean NOT NULL,                        -- aceite dos cookies de anúncio naquele momento
  envio         jsonb NOT NULL DEFAULT '{}'::jsonb,      -- situação por plataforma, ex.: {"meta_pixel": "navegador"}
  teste         boolean NOT NULL DEFAULT false           -- modo de teste: fora dos números reais
);
ALTER TABLE v2.eventos_marketing ENABLE ROW LEVEL SECURITY;

-- Cadastro, onboarding e 1ª fase: no máximo uma vez por aluno.
CREATE UNIQUE INDEX IF NOT EXISTS eventos_marketing_uma_vez_idx ON v2.eventos_marketing (user_id, evento)
  WHERE evento IN ('CompleteRegistration', 'OnboardingCompleted', 'FirstPhaseCompleted');
CREATE INDEX IF NOT EXISTS eventos_marketing_criado_idx ON v2.eventos_marketing (criado_em);
CREATE INDEX IF NOT EXISTS eventos_marketing_pendentes_idx ON v2.eventos_marketing (user_id)
  WHERE envio->>'meta_pixel' = 'pendente';
