// Marketing do site: o consentimento liga e desliga tudo. Todo evento passa por
// track(): sem aceite, não sai nada, nem do navegador. (O envio pelo servidor e o
// registro próprio dos eventos entram na etapa seguinte, com o mesmo event_id.)

import { apagarOrigem, capturarOrigem, persistirOrigem } from './atribuicao';
import { iniciarComportamento, pararComportamento } from './comportamento';
import { aoMudarConsentimento, consentimentoEfetivo, type Consentimento } from './consentimento';
import { enviarEventoMeta, iniciarMetaPixel, novoEventId, pixelAtivo, revogarMetaPixel } from './meta-pixel';

export interface OpcoesEvento {
  /** Evento próprio (at_*, DemoQuestionAnswered...) em vez de evento padrão da Meta. */
  proprio?: boolean;
  /** event_id já escolhido (para parear com o envio do servidor). */
  eventId?: string;
}

/** Envia um evento de marketing. Devolve o event_id usado, ou null se não pôde enviar (sem aceite). */
export function track(nome: string, parametros: Record<string, unknown> = {}, opcoes: OpcoesEvento = {}): string | null {
  if (consentimentoEfetivo() !== 'aceito' || !pixelAtivo()) return null;
  const eventId = opcoes.eventId ?? novoEventId();
  enviarEventoMeta(nome, parametros, eventId, opcoes.proprio ?? false);
  return eventId;
}

function aplicar(consentimento: Consentimento) {
  if (consentimento === 'aceito') {
    persistirOrigem();
    iniciarMetaPixel();
    iniciarComportamento((nome, parametros) => void track(nome, parametros, { proprio: true }));
    return;
  }
  pararComportamento();
  if (pixelAtivo()) revogarMetaPixel();
  if (consentimento === 'recusado') apagarOrigem();
}

/** Liga o marketing conforme o consentimento. Devolve a função que desliga. */
export function iniciarMarketing(): () => void {
  capturarOrigem(); // a origem do anúncio só fica na aba até o aceite
  aplicar(consentimentoEfetivo());
  return aoMudarConsentimento(aplicar);
}

export function pararMarketingParaTestes(): void {
  pararComportamento();
}
