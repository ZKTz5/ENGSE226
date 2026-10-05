import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ScheduleCard from '../components/ScheduleCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey } from '../i18n/translations.js';
import { getSchedules } from '../services/shuttleService.js';

function DashboardPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [schedules, setSchedules] = useState([]);
  const [state, setState] = useState('loading');
  const [errorKey, setErrorKey] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState('loading');
    setErrorKey('');
    getSchedules().then((items) => {
      if (!ignore) {
        setSchedules(items);
        setState('success');
      }
    }).catch((reason) => {
      if (!ignore) {
        setErrorKey(apiErrorKey(reason));
        setState('error');
      }
    });
    return () => { ignore = true; };
  }, [reloadKey]);

  const upcoming = schedules.filter((item) => item.status !== 'expired').slice(0, 3);
  const availableCount = schedules.filter((item) => item.status === 'active').length;

  return (
    <div data-testid="page-dashboard">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">{t('dashboard.eyebrow')}</p>
          <h1>{t('dashboard.headline')}</h1>
          <p>{t('dashboard.intro')}</p>
          <Link className="button light-button" to="/schedules">{t('dashboard.search')} <span aria-hidden="true">→</span></Link>
        </div>
        <div className="hero-transit" aria-hidden="true"><span>🚌</span><i /><b>JY ↔ DS</b></div>
      </section>

      <section className="dashboard-welcome" aria-label={t('dashboard.overview')}>
        <div>
          <p className="eyebrow dark">{t('dashboard.overview')}</p>
          <h2>{session ? t('dashboard.welcome', { name: session.user.name }) : t('dashboard.plan')}</h2>
        </div>
        <div className="availability-stat"><strong>{state === 'success' ? availableCount : '—'}</strong><span>{t('dashboard.availableRoutes')}</span></div>
      </section>

      <section className="schedule-section" aria-labelledby="upcoming-title">
        <div className="section-heading shuttle-section-heading">
          <div><p className="eyebrow dark">{t('dashboard.database')}</p><h2 id="upcoming-title">{t('dashboard.upcoming')}</h2></div>
          <Link className="text-link" to="/schedules">{t('dashboard.all')} <span aria-hidden="true">→</span></Link>
        </div>
        {state === 'loading' && <LoadingState message={t('common.loadingSchedules')} />}
        {state === 'error' && <ErrorState message={t(errorKey)} onRetry={() => setReloadKey((key) => key + 1)} />}
        {state === 'success' && upcoming.length === 0 && (
          <EmptyState title={t('state.noUpcomingTitle')} message={t('state.noUpcomingText')} />
        )}
        {state === 'success' && upcoming.length > 0 && (
          <div className="schedule-list">{upcoming.map((item) => <ScheduleCard key={item.id} schedule={item} />)}</div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
