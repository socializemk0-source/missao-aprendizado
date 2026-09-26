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
  '5 vidas, que recarregam (1 a cada 30 minutos)',
  'Os 5 primeiros capítulos da trilha',
  '1 correção de redação com IA a cada 7 dias',
  'Revisão de erros, prática, desafios, missões e ranking',
];

export const PRO_FEATURES = [
  'Vidas ilimitadas: erre sem medo e aprenda',
  'Todos os capítulos da trilha liberados',
  'Correções de redação com IA ilimitadas',
  'Tudo o que o plano grátis tem',
];
