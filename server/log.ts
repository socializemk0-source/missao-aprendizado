import { AsyncLocalStorage } from 'node:async_hooks';

// Texto de erro para os logs, sem dados pessoais. Erros de consulta do
// Drizzle trazem os parâmetros (id, nome e e-mail do aluno) na mensagem:
// aqui fica só a causa (ex.: "ECONNREFUSED: connect ECONNREFUSED ...").

export function errorText(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = err.cause;
  if (cause instanceof Error) {
    const code = (cause as { code?: unknown }).code;
    return typeof code === 'string' && code ? `${code}: ${cause.message}` : cause.message;
  }
  return err.message.split('\nparams:')[0]!.trim();
}

// ---------------------------------------------------------------- requestId
// Cada pedido à API ganha um requestId (server/seguranca.ts). Ele volta para a
// tela no header X-Request-Id e no corpo de todo erro 5xx, e vai na frente de
// cada linha de log daquele pedido: com o id que o aluno (ou o suporte) vê,
// acha-se o detalhe do erro no log da Vercel. O detalhe nunca vai para a tela.


const contexto = new AsyncLocalStorage<{ requestId: string }>();

export function comRequestId<T>(requestId: string, fn: () => T): T {
  return contexto.run({ requestId }, fn);
}

export const requestIdAtual = (): string | undefined => contexto.getStore()?.requestId;

const prefixo = (args: unknown[]) => {
  const id = requestIdAtual();
  return id ? [`[req:${id}]`, ...args] : args;
};

// Use no lugar de console.error/warn/info nas rotas e no servidor.
export const log = {
  erro: (...args: unknown[]) => console.error(...prefixo(args)),
  aviso: (...args: unknown[]) => console.warn(...prefixo(args)),
  info: (...args: unknown[]) => console.info(...prefixo(args)),
};
