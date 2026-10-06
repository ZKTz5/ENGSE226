import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

function AppHeader() {
  const { session, signOut } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const links = [['/', 'nav.home']];
  if (session) links.push(['/requests/new', 'nav.newRequest'], ['/requests', 'nav.myRequests']);
  if (session?.user?.role === 'admin') links.push(['/admin/requests', 'nav.admin']);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div><p className="eyebrow">{t('brand.eyebrow')}</p><p className="brand">{t('brand.name')}</p></div>
        <nav aria-label={t('nav.aria')}>
          {links.map(([to, key]) => <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end={to === '/'} key={to} to={to}>{t(key)}</NavLink>)}
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/guide">{t('nav.guide')}</NavLink>
          {session ? <button className="nav-link nav-action" type="button" onClick={() => { signOut(); navigate('/login', { replace: true }); }}>{t('nav.logout')} · {session.user.name}</button>
            : <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/login">{t('nav.login')}</NavLink>}
          <button className="language-switch" type="button" onClick={toggleLanguage} aria-label={t('nav.language')}>
            <span className={language === 'th' ? 'language-current' : ''}>ไทย</span><span aria-hidden="true"> | </span><span className={language === 'en' ? 'language-current' : ''}>EN</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
export default AppHeader;
