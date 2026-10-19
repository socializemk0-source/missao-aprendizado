// Cadastro pelo Google: a conta nasce na volta do Google, sem passar pelo
// formulário de /cadastro (que já manda o CompleteRegistration do e-mail). Aqui
// o app conta a conta nova quando a vê pela primeira vez: só se foi criada há
// pouco (login de conta antiga não é cadastro) e uma vez por conta no aparelho.

import { track } from './marketing';

const CONTA_NOVA_MS = 10 * 60_000;
const chave = (id: string) => `aprova-tico:cadastro-contado:${id}`;

interface UsuarioDaSessao {
  id: string;
  created_at?: string;
  app_metadata?: { provider?: string };
}

export function registrarCadastroSocial(user: UsuarioDaSessao, agora = Date.now()): void {
  const provider = user.app_metadata?.provider;
  if (!provider || provider === 'email') return;
  const criado = Date.parse(user.created_at ?? '');
  if (!(agora - criado < CONTA_NOVA_MS)) return;
  try {
    if (localStorage.getItem(chave(user.id))) return;
  } catch {
    // Sem armazenamento: conta assim mesmo (no máximo repete numa recarga).
  }
  // Sem pixel ligado, track devolve null: não marca, para contar quando ligar.
  if (!track('CompleteRegistration', { status: provider, content_name: 'cadastro' })) return;
  try {
    localStorage.setItem(chave(user.id), '1');
  } catch {
    // idem
  }
}
