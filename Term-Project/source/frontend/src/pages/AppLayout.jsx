import { Outlet } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

function AppLayout() {
  const { t } = useLanguage();
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
