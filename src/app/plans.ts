// Planos do Aprova Tico (mesmos valores do V1). A cobrança em si é sempre
// decidida no servidor; isto é só o que a tela mostra.

export interface PlanOption {
  id: 'monthly' | 'annual';
  label: string;
  price: string;
  period: string;
  note: string;
}

export const PRO_OPTIONS: PlanOption[] = [
  { id: 'monthly', label: '30 dias', price: '29,90', period: 'por 30 dias', note: 'Pagamento único no PIX ou cartão, sem renovação automática.' },
  { id: 'annual', label: '1 ano', price: '239,90', period: 'por 1 ano', note: 'Sai por R$ 19,99 por mês. Economia de R$ 118,90.' },
];

export const FREE_FEATURES = [
  '5 vidas, que recarregam com o tempo',
  'Primeiros capítulos da trilha',
  '1 correção de redação com IA por semana',
  'Missões diárias, sequência e ranking',
];

export const PRO_FEATURES = [
  'Vidas ilimitadas: erre sem medo e aprenda',
  'Todos os capítulos e fases liberados',
  'Correções de redação com IA ilimitadas',
  'Revisão de erros e estatísticas por assunto',
  'Selo PRO no perfil e no ranking',
];
