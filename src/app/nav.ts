import type { IconName } from '../components/Icon';

export interface NavEntry {
  path: string;
  label: string;
  icon: IconName;
}

// Mesma estrutura do V1. A trilha é a tela inicial do app.
export const NAV: NavEntry[] = [
  { path: '/jogar', label: 'Trilha', icon: 'compass' },
  { path: '/redacao', label: 'Redação', icon: 'pen' },
  { path: '/simulados', label: 'Simulados', icon: 'clipboard' },
  { path: '/aventura', label: 'Aventura', icon: 'map' },
  { path: '/missoes', label: 'Missões', icon: 'target' },
  { path: '/ranking', label: 'Ranking', icon: 'trophy' },
  { path: '/disciplinas', label: 'Disciplinas', icon: 'book' },
  { path: '/jogos', label: 'Jogos', icon: 'gamepad' },
  { path: '/revisar', label: 'Revisar', icon: 'rotate' },
  { path: '/conquistas', label: 'Conquistas', icon: 'medal' },
  { path: '/planos', label: 'Planos', icon: 'crown' },
  { path: '/perfil', label: 'Meu Perfil', icon: 'user' },
];

export const BRAND = { first: 'Aprova', second: 'Tico' };

// E-mail de contato para dúvidas e pedidos de privacidade (LGPD).
// Preencher antes do lançamento.
export const CONTACT_EMAIL = '';
