import type { IconName } from '../components/Icon';

export interface NavEntry {
  path: string;
  label: string;
  icon: IconName;
  // Etapa do plano em que a tela fica pronta (enquanto isso: "em construção").
  readyIn?: string;
}

// Mesma estrutura do V1. A trilha é a tela inicial do app.
export const NAV: NavEntry[] = [
  { path: '/jogar', label: 'Trilha', icon: 'compass', readyIn: 'etapa 2' },
  { path: '/redacao', label: 'Redação', icon: 'pen', readyIn: 'etapa 4' },
  { path: '/aventura', label: 'Aventura', icon: 'map', readyIn: 'etapa 2' },
  { path: '/missoes', label: 'Missões', icon: 'target', readyIn: 'etapa 3' },
  { path: '/ranking', label: 'Ranking', icon: 'trophy', readyIn: 'etapa 3' },
  { path: '/disciplinas', label: 'Disciplinas', icon: 'book', readyIn: 'etapa 2' },
  { path: '/jogos', label: 'Jogos', icon: 'gamepad', readyIn: 'etapa 3' },
  { path: '/revisar', label: 'Revisar', icon: 'rotate', readyIn: 'etapa 3' },
  { path: '/conquistas', label: 'Conquistas', icon: 'medal', readyIn: 'etapa 3' },
  { path: '/planos', label: 'Planos', icon: 'crown', readyIn: 'etapa 5' },
  { path: '/perfil', label: 'Meu Perfil', icon: 'user' },
];

export const BRAND = { first: 'Aprova', second: 'Tico' };
