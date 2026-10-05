import type { IconName } from '../components/Icon';

export interface NavEntry {
  path: string;
  label: string;
  icon: IconName;
}

// "Hoje" (o plano do dia) é a tela inicial do app; depois, a trilha.
export const NAV: NavEntry[] = [
  { path: '/hoje', label: 'Hoje', icon: 'calendar' },
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
export const CONTACT_EMAIL = 'contato@aprovatico.com.br';
export const INSTAGRAM_URL = 'https://www.instagram.com/aprovatico/';

// Quem vende (Decreto 7.962/2013): aparece nos termos e no rodapé.
export const COMPANY = { name: '69.457.590 VITOR FERNANDES DOS SANTOS', cnpj: '69.457.590/0001-82' };
