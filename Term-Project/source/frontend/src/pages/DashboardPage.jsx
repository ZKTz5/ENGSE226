import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ScheduleCard from '../components/ScheduleCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getSchedules } from '../services/shuttleService.js';

function DashboardPage() {
  const { session } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState('loading');
    getSchedules().then((items) => {
      if (!ignore) {
        setSchedules(items);
        setState('success');
      }
    }).catch((reason) => {
      if (!ignore) {
        setError(reason.message || 'Could not load shuttle schedules.');
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
          <p className="eyebrow">MOVE BETWEEN CAMPUSES</p>
          <h1>Your next campus is closer.</h1>
          <p>Find a shuttle between Doi Saket, Jed Yod, and Chiang Mai.</p>
          <Link className="button light-button" to="/schedules">Search schedules <span aria-hidden="true">→</span></Link>
        </div>
        <div className="hero-mark" aria-hidden="true"><span>R</span><i>↗</i></div>
      </section>

      <section className="dashboard-welcome" aria-label="Welcome">
        <div>
          <p className="eyebrow dark">SHUTTLE OVERVIEW</p>
          <h2>{session ? `Welcome, ${session.user.name}` : 'Plan your campus trip'}</h2>
        </div>
        <div className="availability-stat"><strong>{state === 'success' ? availableCount : '—'}</strong><span>routes with seats</span></div>
      </section>

      <section className="schedule-section" aria-labelledby="upcoming-title">
        <div className="section-heading shuttle-section-heading">
          <div><p className="eyebrow dark">DATABASE SCHEDULES</p><h2 id="upcoming-title">Upcoming departures</h2></div>
          <Link className="text-link" to="/schedules">View all routes <span aria-hidden="true">→</span></Link>
        </div>
        {state === 'loading' && <LoadingState message="Loading live shuttle schedules…" />}
        {state === 'error' && <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />}
        {state === 'success' && upcoming.length === 0 && (
          <EmptyState title="No upcoming shuttles" message="There are no upcoming departures right now. Check back soon." />
        )}
        {state === 'success' && upcoming.length > 0 && (
          <div className="schedule-list">{upcoming.map((item) => <ScheduleCard key={item.id} schedule={item} />)}</div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
