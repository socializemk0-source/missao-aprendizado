// Botão do modo foco/leitura: esconde menu, placar e distrações, aumenta a
// letra e (por padrão) desliga sons e animações. Esc sai. Sair da tela sai
// do modo foco também.

import { useEffect } from 'react';
import { setFocus, usePrefs } from '../lib/prefs';
import { Icon } from './Icon';

export function FocusToggle() {
  const { focus } = usePrefs();

  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocus(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus]);

  useEffect(() => () => setFocus(false), []);

  return (
    <button
      type="button" className={`focus-btn ${focus ? 'is-on' : ''}`} aria-pressed={focus}
      title={focus ? 'Sair do modo foco (Esc)' : 'Modo foco: só a questão na tela'} onClick={() => setFocus(!focus)}
    >
      <Icon name={focus ? 'minimize' : 'maximize'} size={18} />
      <span>{focus ? 'Sair do foco' : 'Modo foco'}</span>
    </button>
  );
}
