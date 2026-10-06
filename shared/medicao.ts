// Medição de marketing: nomes dos eventos e da origem, usados pelo servidor
// e pelas telas. Plano e motivos: docs/medicao.md.

// Etiquetas do link de origem (UTM) e códigos de clique das plataformas.
export const CHAVES_ORIGEM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'] as const;
export type ChaveOrigem = (typeof CHAVES_ORIGEM)[number];

// Primeira origem: a 1ª visita com etiqueta vale por este prazo; visitas
// seguintes dentro dele não trocam a origem.
export const ORIGEM_VALIDADE_DIAS = 30;

export type Origem = Partial<Record<ChaveOrigem, string>> & {
  pagina?: string; // página em que a pessoa chegou
  em?: string; // quando chegou (ISO)
};

// Eventos que a tela registra (os outros o servidor registra sozinho).
export const EVENTOS_NAVEGADOR = ['PageView', 'DemoQuestionAnswered', 'ViewContent', 'InitiateCheckout'] as const;
export type EventoNavegador = (typeof EVENTOS_NAVEGADOR)[number];
export type EventoServidor = 'Lead' | 'CompleteRegistration' | 'OnboardingCompleted' | 'FirstPhaseCompleted';
export type NomeEvento = EventoNavegador | EventoServidor;

// Eventos-padrão da Meta (fbq 'track'); os outros são personalizados ('trackCustom').
export const PADRAO_META: ReadonlySet<string> = new Set(['PageView', 'Lead', 'CompleteRegistration', 'ViewContent', 'InitiateCheckout', 'Purchase']);

// O que o pixel dispara: o event_id é o mesmo do registro próprio (e da API
// de Conversões na fase B), para a Meta contar uma vez só.
export interface EventoParaPixel {
  nome: string;
  eventId: string;
  dados: Record<string, string | number>;
}
