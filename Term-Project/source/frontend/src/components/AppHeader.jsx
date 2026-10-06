import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { getActiveNavigationPage } from './activeNavigationPage.js';

function AppHeader() {
  const { session, signOut } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = getActiveNavigationPage(location.pathname);

  const links = [['/', 'nav.home']];
  if (session) links.push(['/requests/new', 'nav.newRequest'], ['/requests', 'nav.myRequests']);
  if (session?.user?.role === 'admin') links.push(['/admin/requests', 'nav.admin']);
  links.push(['/guide', 'nav.guide']);

  function pageLink([to, key]) {
    const active = activePage === key;
    return <Link className={`nav-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} key={to} to={to}>{t(key)}</Link>;
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div><p className="eyebrow">{t('brand.eyebrow')}</p><p className="brand">{t('brand.name')}</p></div>
        <nav aria-label={t('nav.aria')}>
          {links.map(pageLink)}
          {session ? <button className="nav-link nav-action" type="button" onClick={() => { signOut(); navigate('/login', { replace: true }); }}>{t('nav.logout')} · {session.user.name}</button>
            : <Link className="nav-link" to="/login">{t('nav.login')}</Link>}
          <button className="language-switch" type="button" onClick={toggleLanguage} aria-label={t('nav.language')}>
            <span className={language === 'th' ? 'language-current' : ''}>ไทย</span><span aria-hidden="true"> | </span><span className={language === 'en' ? 'language-current' : ''}>EN</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
export default AppHeader;
