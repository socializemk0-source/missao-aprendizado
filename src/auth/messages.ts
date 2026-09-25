// Mensagens de erro do Supabase Auth (em inglês) → português, sem detalhes
// técnicos. Qualquer erro desconhecido vira uma mensagem genérica.

const RULES: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos antes de entrar.'],
  [/user already registered|already been registered/i, 'Este e-mail já tem conta. Entre ou use "Esqueci minha senha".'],
  [/password should be at least|password is too short|weak password/i, 'A senha precisa ter pelo menos 8 caracteres, com letras e números.'],
  [/rate limit|too many requests|security purposes/i, 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'],
  [/invalid email|unable to validate email/i, 'Confira o e-mail digitado.'],
  [/same password|different from the old password/i, 'A nova senha precisa ser diferente da atual.'],
  [/network|failed to fetch/i, 'Sem conexão com o servidor. Confira sua internet.'],
];

export function authErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? 'Não foi possível concluir agora. Tente de novo.';
}

// Regra de senha usada no cadastro e na troca de senha.
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.';
  return null;
}
