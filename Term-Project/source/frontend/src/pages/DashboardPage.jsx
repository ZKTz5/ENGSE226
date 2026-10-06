import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import VehicleRequestCard from '../components/VehicleRequestCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey } from '../i18n/translations.js';
import { getMyVehicleRequests } from '../services/vehicleRequestService.js';

function DashboardPage() {
  const { session, ready } = useAuth();
  const { t } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [state, setState] = useState('loading');
  const [errorKey, setErrorKey] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return undefined;
    if (!session) { setState('guest'); setRequests([]); return undefined; }
    let ignore = false;
    setState('loading');
    getMyVehicleRequests().then((rows) => { if (!ignore) { setRequests(rows); setState('success'); } })
      .catch((error) => { if (!ignore) { setErrorKey(apiErrorKey(error)); setState('error'); } });
    return () => { ignore = true; };
  }, [session, ready, reloadKey]);

  return (
    <div data-testid="page-dashboard">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">{t('dashboard.eyebrow')}</p>
          <h1>{t('dashboard.headline')}</h1>
          <p>{t('dashboard.intro')}</p>
          <Link className="button light-button" to={session ? '/requests/new' : '/login'}>{t(session ? 'common.newRequest' : 'nav.login')} <span aria-hidden="true">→</span></Link>
        </div>
        <div className="hero-transit" aria-hidden="true"><span>🚌</span><i /><b>JY ↔ DS</b></div>
      </section>
      <section className="dashboard-welcome">
        <div><p className="eyebrow dark">{t('dashboard.overview')}</p><h2>{session ? t('dashboard.welcome', { name: session.user.name }) : t('dashboard.plan')}</h2></div>
        {session && <Link className="button secondary inline" to="/requests">{t('common.myRequests')}</Link>}
      </section>
      {state === 'guest' && <EmptyState title={t('dashboard.guestTitle')} message={t('dashboard.guestText')} action={<Link className="button primary inline" to="/login">{t('nav.login')}</Link>} />}
      {state === 'loading' && <LoadingState message={t('common.loadingRequests')} />}
      {state === 'error' && <ErrorState message={t(errorKey)} onRetry={() => setReloadKey((key) => key + 1)} />}
      {state === 'success' && requests.length === 0 && <EmptyState title={t('request.emptyTitle')} message={t('request.emptyText')} action={<Link className="button primary inline" to="/requests/new">{t('common.newRequest')}</Link>} />}
      {state === 'success' && requests.length > 0 && <section className="request-section">
        <div className="section-heading"><div><p className="eyebrow dark">{t('dashboard.personal')}</p><h2>{t('request.recentTitle')}</h2></div><Link className="text-link" to="/requests">{t('common.viewAll')}</Link></div>
        <div className="request-list">{requests.slice(0, 3).map((item) => <VehicleRequestCard key={item.id} request={item} />)}</div>
      </section>}
    </div>
  );
}
export default DashboardPage;
