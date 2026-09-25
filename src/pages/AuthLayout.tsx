import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BRAND } from '../app/nav';
import { Icon } from '../components/Icon';
import { Tico, type TicoPose } from '../components/Tico';

// Moldura das telas de entrar/cadastrar/redefinir senha.
export function AuthLayout({ title, subtitle, pose = 'acenando', children }: { title: string; subtitle?: string; pose?: TicoPose; children: ReactNode }) {
  return (
    <div className="auth-page">
      <Link to="/" className="brand auth-brand">
        <span className="brand-mark"><Icon name="compass" /></span>
        <span>{BRAND.first} {BRAND.second}<span className="brand-accent">.</span></span>
      </Link>
      <div className="auth-shell">
        <Tico pose={pose} className="auth-tico" />
        <section className="card auth-card" aria-labelledby="auth-title">
          <h1 id="auth-title" className="page-title">{title}</h1>
          {subtitle && <p className="muted auth-subtitle">{subtitle}</p>}
          {children}
        </section>
      </div>
    </div>
  );
}
