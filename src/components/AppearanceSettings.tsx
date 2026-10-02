// "Aparência e som" (no Perfil): tema, sons, animações e modo foco.
// Vale para este aparelho; muda na hora.

import { setPrefs, usePrefs, type Theme } from '../lib/prefs';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
  { id: 'auto', label: 'Automático' },
];

export function AppearanceSettings() {
  const { prefs } = usePrefs();
  return (
    <section className="card settings-card" aria-labelledby="settings-title">
      <h2 id="settings-title" className="section-title">Aparência e som</h2>
      <p className="muted settings-note">Vale para este aparelho.</p>

      <fieldset className="chip-group">
        <legend>Tema</legend>
        {THEMES.map((t) => (
          <label key={t.id} className={`chip ${prefs.theme === t.id ? 'is-on' : ''}`}>
            <input type="radio" name="tema" className="visually-hidden" checked={prefs.theme === t.id} onChange={() => setPrefs({ theme: t.id })} />
            {t.label}
          </label>
        ))}
      </fieldset>
      <p className="field-hint settings-hint">O app começa no claro. Automático segue o claro/escuro do seu celular ou computador.</p>

      <label className="switch-row">
        <input type="checkbox" checked={prefs.sound} onChange={(e) => setPrefs({ sound: e.target.checked })} />
        <span>Sons de acerto e erro</span>
      </label>
      <label className="switch-row">
        <input type="checkbox" checked={prefs.motion} onChange={(e) => setPrefs({ motion: e.target.checked })} />
        <span>Animações</span>
      </label>
      <label className="switch-row">
        <input type="checkbox" checked={prefs.focusQuiet} onChange={(e) => setPrefs({ focusQuiet: e.target.checked })} />
        <span>No modo foco, desligar sons e animações</span>
      </label>
      <label className="switch-row">
        <input type="checkbox" checked={prefs.readingTone === 'sepia'} onChange={(e) => setPrefs({ readingTone: e.target.checked ? 'sepia' : 'normal' })} />
        <span>Modo foco em tom creme (cansa menos a vista)</span>
      </label>
    </section>
  );
}
