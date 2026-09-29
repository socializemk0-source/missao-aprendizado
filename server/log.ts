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
