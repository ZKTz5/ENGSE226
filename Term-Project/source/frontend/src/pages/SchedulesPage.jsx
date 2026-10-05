import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ScheduleCard from '../components/ScheduleCard.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorKey, displayCampusName } from '../i18n/translations.js';
import { getCampuses, getSchedules } from '../services/shuttleService.js';

function SchedulesPage() {
  const { language, t } = useLanguage();
  const [campuses, setCampuses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [filters, setFilters] = useState({ originId: '', destinationId: '', date: '' });
  const [state, setState] = useState('loading');
  const [errorKey, setErrorKey] = useState('');
  const [searched, setSearched] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState('loading');
    setErrorKey('');
    Promise.all([getCampuses(), getSchedules()]).then(([campusData, scheduleData]) => {
      if (!ignore) {
        setCampuses(campusData);
        setSchedules(scheduleData);
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

  function updateFilter(event) {
    event.currentTarget.setCustomValidity('');
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function handleSearch(event) {
    event.preventDefault();
    if (filters.originId && filters.originId === filters.destinationId) {
      setErrorKey('schedule.differentCampuses');
      setState('error');
      return;
    }
    setErrorKey('');
    setSearched(true);
    setState('loading');
    try {
      setSchedules(await getSchedules(filters));
      setState('success');
    } catch (reason) {
      setErrorKey(apiErrorKey(reason));
      setState('error');
    }
  }

  function resetSearch() {
    setFilters({ originId: '', destinationId: '', date: '' });
    setSearched(false);
    setState('loading');
    setErrorKey('');
    getSchedules().then((items) => { setSchedules(items); setState('success'); })
      .catch((reason) => { setErrorKey(apiErrorKey(reason)); setState('error'); });
  }

  return (
    <section data-testid="page-schedules">
      <div className="page-heading shuttle-page-heading">
        <div><p className="eyebrow dark">{t('schedule.eyebrow')}</p><h1>{t('schedule.title')}</h1><p>{t('schedule.intro')}</p></div>
      </div>
      <form className="search-panel" onSubmit={handleSearch}>
        <div className="search-fields">
          <div className="field">
            <label htmlFor="originId">{t('schedule.from')}</label>
            <select id="originId" name="originId" value={filters.originId} onInvalid={(event) => event.currentTarget.setCustomValidity(t('validation.required'))} onChange={updateFilter} required>
              <option value="">{t('schedule.chooseCampus')}</option>
              {campuses.map((campus) => <option key={campus.id} value={campus.id}>{displayCampusName(campus.name, language)}</option>)}
            </select>
          </div>
          <div className="route-swap" aria-hidden="true">→</div>
          <div className="field">
            <label htmlFor="destinationId">{t('schedule.to')}</label>
            <select id="destinationId" name="destinationId" value={filters.destinationId} onInvalid={(event) => event.currentTarget.setCustomValidity(t('validation.required'))} onChange={updateFilter} required>
              <option value="">{t('schedule.chooseCampus')}</option>
              {campuses.map((campus) => <option key={campus.id} value={campus.id}>{displayCampusName(campus.name, language)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="travel-date">{t('schedule.travelDate')}</label>
            <input id="travel-date" name="date" type="date" value={filters.date} onInvalid={(event) => event.currentTarget.setCustomValidity(t('validation.required'))} onChange={updateFilter} required />
          </div>
          <button className="button primary search-button" type="submit" disabled={state === 'loading'}>
            {state === 'loading' && searched ? t('schedule.searching') : t('schedule.search')}
          </button>
        </div>
      </form>

      <div className="results-heading">
        <div><p className="eyebrow dark">{t('schedule.live')}</p><h2>{searched ? t('schedule.results') : t('schedule.departures')}</h2></div>
        {searched && <button className="text-button" type="button" onClick={resetSearch}>{t('common.clear')}</button>}
      </div>

      {state === 'loading' && <LoadingState message={t('common.loadingSchedules')} />}
      {state === 'error' && <ErrorState message={t(errorKey)} onRetry={() => setReloadKey((key) => key + 1)} />}
      {state === 'success' && schedules.length === 0 && (
        <EmptyState title={t(searched ? 'state.noMatchesTitle' : 'state.noSchedulesTitle')}
          message={t(searched ? 'state.noMatchesText' : 'state.noSchedulesText')} />
      )}
      {state === 'success' && schedules.length > 0 && (
        <div className="schedule-list">{schedules.map((schedule) => <ScheduleCard key={schedule.id} schedule={schedule} />)}</div>
      )}
    </section>
  );
}

export default SchedulesPage;
