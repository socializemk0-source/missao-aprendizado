// Medição de marketing (fase A): consentimento de cookies de anúncio por
// aluno. A interface existe para os testes trocarem o banco pela versão em
// memória (a do Postgres fica em marketing-pg.ts).
//
// Regra: nada aqui pode derrubar cadastro, estudo ou pagamento. Quem chama
// trata o erro e segue.

export interface MarketingStore {
  // null = o aluno ainda não escolheu.
  consentimento(userId: string): Promise<boolean | null>;
  // Grava a escolha e a data. Repetir a mesma escolha não muda a data.
  salvarConsentimento(userId: string, aceito: boolean, now: Date): Promise<void>;
}

export interface MarketingUsuario {
  consentimento: boolean | null;
  consentimentoEm: Date | null;
}

export function memoryMarketing(): MarketingStore & { usuarios: Map<string, MarketingUsuario> } {
  const usuarios = new Map<string, MarketingUsuario>();
  return {
    usuarios,
    async consentimento(userId) {
      return usuarios.get(userId)?.consentimento ?? null;
    },
    async salvarConsentimento(userId, aceito, now) {
      const atual = usuarios.get(userId);
      if (atual?.consentimento === aceito) return;
      usuarios.set(userId, { ...atual, consentimento: aceito, consentimentoEm: now });
    },
  };
}
