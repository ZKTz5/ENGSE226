import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ScheduleCard from '../components/ScheduleCard.jsx';
import { getCampuses, getSchedules } from '../services/shuttleService.js';

function SchedulesPage() {
  const [campuses, setCampuses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [filters, setFilters] = useState({ originId: '', destinationId: '', date: '' });
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState('loading');
    Promise.all([getCampuses(), getSchedules()]).then(([campusData, scheduleData]) => {
      if (!ignore) {
        setCampuses(campusData);
        setSchedules(scheduleData);
        setState('success');
      }
    }).catch((reason) => {
      if (!ignore) {
        setError(reason.message || 'Could not load campus and schedule data.');
        setState('error');
      }
    });
    return () => { ignore = true; };
  }, [reloadKey]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function handleSearch(event) {
    event.preventDefault();
    if (filters.originId === filters.destinationId) {
      setError('Choose two different campuses for your trip.');
      setState('error');
      return;
    }
    setError('');
    setSearched(true);
    setState('loading');
    try {
      setSchedules(await getSchedules(filters));
      setState('success');
    } catch (reason) {
      setError(reason.message || 'Could not search shuttle schedules.');
      setState('error');
    }
  }

  function resetSearch() {
    setFilters({ originId: '', destinationId: '', date: '' });
    setSearched(false);
    setState('loading');
    getSchedules().then((items) => { setSchedules(items); setState('success'); })
      .catch((reason) => { setError(reason.message); setState('error'); });
  }

  return (
    <section data-testid="page-schedules">
      <div className="page-heading shuttle-page-heading">
        <div><p className="eyebrow dark">CAMPUS TRANSIT</p><h1>Find a shuttle</h1><p>Choose your campuses and travel date to see scheduled departures.</p></div>
      </div>
      <form className="search-panel" onSubmit={handleSearch}>
        <div className="search-fields">
          <div className="field">
            <label htmlFor="originId">From</label>
            <select id="originId" name="originId" value={filters.originId} onChange={updateFilter} required>
              <option value="">Select campus</option>
              {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
            </select>
          </div>
          <div className="route-swap" aria-hidden="true">→</div>
          <div className="field">
            <label htmlFor="destinationId">To</label>
            <select id="destinationId" name="destinationId" value={filters.destinationId} onChange={updateFilter} required>
              <option value="">Select campus</option>
              {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="travel-date">Travel date</label>
            <input id="travel-date" name="date" type="date" value={filters.date} onChange={updateFilter} required />
          </div>
          <button className="button primary search-button" type="submit" disabled={state === 'loading' && campuses.length === 0}>Search schedules</button>
        </div>
      </form>

      <div className="results-heading">
        <div><p className="eyebrow dark">LIVE FROM RMUTL DATABASE</p><h2>{searched ? 'Search results' : 'Scheduled departures'}</h2></div>
        {searched && <button className="text-button" type="button" onClick={resetSearch}>Clear search</button>}
      </div>

      {state === 'loading' && <LoadingState message="Loading shuttle schedules…" />}
      {state === 'error' && <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />}
      {state === 'success' && schedules.length === 0 && (
        <EmptyState title={searched ? 'No shuttles match your search' : 'No schedules available'}
          message={searched ? 'Try another campus pair or travel date.' : 'There are no departures to show right now.'} />
      )}
      {state === 'success' && schedules.length > 0 && (
        <div className="schedule-list">{schedules.map((schedule) => <ScheduleCard key={schedule.id} schedule={schedule} />)}</div>
      )}
    </section>
  );
}

export default SchedulesPage;
