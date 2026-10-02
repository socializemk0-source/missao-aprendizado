// Moldura das páginas legais (privacidade e termos): cabeçalho com a marca e
// o texto numa coluna de leitura.

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BRAND } from '../app/nav';
import { Icon } from '../components/Icon';

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="brand">
          <span className="brand-mark"><Icon name="compass" /></span>
          <span>{BRAND.first} {BRAND.second}<span className="brand-accent">.</span></span>
        </Link>
      </header>
      <main className="legal">
        <h1 className="page-title">{title}</h1>
        <p className="muted">Atualizada em {updated}.</p>
        {children}
        <p><Link to="/">Voltar para a página inicial</Link></p>
      </main>
    </div>
  );
}
