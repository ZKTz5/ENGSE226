import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import AppHeader from '../components/AppHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

function AppLayout() {
  const { t } = useLanguage();
  const { ready, session, messageKey } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !session && messageKey && location.pathname !== '/login') {
      navigate('/login', { replace: true, state: { authMessage: messageKey } });
    }
  }, [ready, session, messageKey, location.pathname, navigate]);

  return (
    <div className="app-shell" data-testid="app-layout">
      <AppHeader />
      <main className="container page-content" id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer"><div className="container">{t('footer')}</div></footer>
    </div>
  );
}

export default AppLayout;
