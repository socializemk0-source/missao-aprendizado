# Execução das correções autorizadas

Base: relatório REVISAO.md, aprovado pelo usuário em “faça isso por favor”.
Objetivo: corrigir contas e preservação de dados primeiro; revisar o PR #14 antes de alterar a integração de pagamentos.
Execução na cópia local já usada pela prévia, em branch `fix/account-data-integrity`, mantendo `sources/` intacto.

- [ ] 1. Perfil: teste de atualização parcial e recadastro; criar usuário sem sobrescrever registros existentes, validar campos e manter dados de perfil coerentes.
- [ ] 2. Sessão: testes com provedor simulado; inicialização sem credenciais, restauração validada, erro de perfil explícito, callback sem espera circular, confirmação de cadastro e recuperação de senha.
- [ ] 3. Armazenamento: testes de visitante/conta A/conta B; separar chaves do jogo por identidade e preservar cópia legada. Impedir dados de uma aba antiga de serem escritos na conta nova.
- [ ] 4. Formulários e informação: ligar confirmação/reenvio/recuperação; corrigir mensagens de sincronização, links diretos e aviso sobre dados. Verificar no navegador desktop e móvel.
- [ ] 5. Pagamentos: buscar PR #14, revisar contrato e riscos. Aplicar somente mudanças verificáveis; não ativar produção, fazer cobranças ou migrar banco sem ambiente preparado.
- [ ] 6. Verificação: suíte completa, sintaxe, diff, revisão independente e relatório de pendências reais.

Critérios de teste: atualizações não alteram campos ausentes; cadastro não altera plano/XP; falhas de serviço não se passam por sucesso; troca de conta não mistura jornadas; criação de conta com confirmação exigida retorna estado pendente; checkout repetido não perde vínculo faturável.

Decisão: preservar estrutura atual e corrigir os fluxos existentes; não reconstruir o frontend compilado nesta etapa. Recuperação de senha é um novo fluxo complementar ao cadastro existente.

Progresso e resultados serão registrados abaixo.
