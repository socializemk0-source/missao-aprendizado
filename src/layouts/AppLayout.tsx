import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { BRAND, NAV } from '../app/nav';
import { Icon } from '../components/Icon';
import { useProgress } from '../game/ProgressProvider';

export function AppLayout() {
  const { me } = useAuth();
  const { progress } = useProgress();
  const firstName = me?.profile.displayName.split(/\s+/)[0] ?? '';

  return (
    <>
      <nav className="sidebar" aria-label="Navegação principal">
        <Link to="/jogar" className="brand" aria-label={`${BRAND.first} ${BRAND.second} — início`}>
          <span className="brand-mark"><Icon name="compass" /></span>
          <span>{BRAND.first}<br />{BRAND.second}<span className="brand-accent">.</span></span>
        </Link>
        <p className="nav-section">SUA AVENTURA</p>
        {NAV.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="workspace">
        <header className="topbar">
          <Link to="/" className="topbar-home"><Icon name="home" size={18} /><span>Página inicial</span></Link>
          <div className="topbar-stats">
            <span className={`stat stat-flame${progress?.studiedToday ? ' is-lit' : ''}`} title="Dias seguidos estudando"><Icon name="flame" size={20} />{progress?.streak ?? 0} <small>{progress?.streak === 1 ? 'dia' : 'dias'}</small></span>
            <span className="stat stat-star" title="Pontos de experiência"><Icon name="star" size={20} />{progress?.xp ?? 0} <small>XP</small></span>
            <span className="stat stat-heart" title={progress?.hearts === null ? 'Vidas ilimitadas (PRO)' : 'Vidas'}>❤ {progress ? (progress.hearts ?? '∞') : 5}</span>
            <Link to="/perfil" className="account-btn" title="Minha conta">
              <span className="avatar" aria-hidden="true">👤</span>
              <span className="name">{firstName || 'Minha conta'}</span>
            </Link>
          </div>
        </header>
        <main className="content" id="conteudo">
          <Outlet />
        </main>
      </div>
    </>
  );
}
